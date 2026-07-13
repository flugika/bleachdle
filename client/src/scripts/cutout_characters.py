#!/usr/bin/env python3
"""
cutout_characters.py
---------------------
Two modes, one script:

  --mode cutout (default)
      Batch background removal for anime character portraits (.webp -> .webp).
      assets/characters/Sosuke_Aizen.webp -> assets/character_cutout/Sosuke_Aizen_cutout.webp

  --mode silhouette
      Turns an already-transparent cutout into a flat black silhouette
      (object stays, background stays transparent). No rembg needed for
      this mode -> only Pillow is required.
      assets/character_cutout/Sosuke_Aizen_cutout.webp
          -> assets/character_silhouette/Sosuke_Aizen_cutout_silhouette.webp

Why cutout mode isn't just the 3-line shell loop:
  * rembg's default model (u2net) is trained on real photos. Anime closeups
    with sharp hair strands / accessories get chewed up -> use `isnet-anime`,
    a model trained specifically on anime art, much cleaner edges for silhouettes.
  * rembg's CLI `rembg i` always writes PNG. We decode the RGBA result
    ourselves and re-encode to WebP (lossless, alpha preserved) so the
    output format matches the input.
  * Closeup portraits often have very tight framing, so a hard subject/background
    split can clip fine details (stray hair, weapon tips at the frame edge).
    Alpha matting is offered as a flag to soften/refine those edges.
  * One bad image should not kill the whole batch -> per-file try/except,
    a summary at the end, and a contact sheet so you can eyeball 50 cutouts
    in one image instead of opening each file.

Why silhouette mode exists as a separate step (not a CSS filter at runtime):
  * If you ship the full-color cutout to the browser and only darken it with
    CSS (brightness(0) etc.), anyone can open devtools, drop the filter, or
    just fetch the image URL directly and see the full-color art immediately.
  * Baking a real black-silhouette file server-side means the client only
    ever receives pixels that are already black -> nothing to "undo" client-side.

Usage:
    Windows : py -m pip install "rembg[cpu]" pillow
    Linux   : pip install "rembg[cpu]" pillow --break-system-packages

    # Step 1: remove backgrounds
    py cutout_characters.py --mode cutout --contact-sheet

    # Step 2: turn cutouts into black silhouettes
    py cutout_characters.py --mode silhouette --contact-sheet

    py cutout_characters.py --mode cutout --alpha-matting     # better edges on tricky closeups
    py cutout_characters.py --mode silhouette --color 20,20,20 --alpha 255
    py cutout_characters.py --mode silhouette --overwrite --only Aizen Yammy
"""

import argparse
import sys
import time
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit(
        "Pillow is not installed.\n"
        "  py -m pip install pillow      (Windows)\n"
        "  pip install pillow --break-system-packages   (Linux)"
    )


# Anime-specific model. Alternatives: "u2net" (generic photo), "isnet-general-use".
DEFAULT_MODEL = "isnet-anime"

# Defaults are resolved relative to THIS FILE's location, not the current working
# directory. That way `py src/scripts/cutout_characters.py` works the same whether
# you run it from the project root, from client/, or from inside scripts/ itself.
# Layout assumed: client/src/scripts/cutout_characters.py
#                 client/assets-private/characters/*.webp            (raw source art)
#                 client/public/assets/character_cutout/*.webp      (bg removed)
#                 client/public/assets/character_silhouette/*.webp  (flat black shapes)
_SCRIPT_DIR = Path(__file__).resolve().parent           # .../client/src/scripts
_CLIENT_DIR = _SCRIPT_DIR.parent.parent                  # .../client
_ASSETS_DIR = _CLIENT_DIR / "public" / "assets"

_MODE_DEFAULTS = {
    "cutout": {
        "input": _ASSETS_DIR / "characters",
        "output": _ASSETS_DIR / "character_cutout",
        "suffix": "_cutout",
    },
    "silhouette": {
        "input": _ASSETS_DIR / "character_cutout",
        "output": _ASSETS_DIR / "character_silhouette",
        "suffix": "_silhouette",
    },
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--mode", choices=["cutout", "silhouette"], default="cutout",
                   help="cutout: remove bg with rembg. silhouette: flatten an existing cutout to solid color.")
    p.add_argument("--input", default=None, help="Input folder (default depends on --mode, see docstring)")
    p.add_argument("--output", default=None, help="Output folder (default depends on --mode, see docstring)")
    p.add_argument("--suffix", default=None, help="Suffix appended before the extension (default depends on --mode)")
    p.add_argument("--overwrite", action="store_true", help="Reprocess files even if output already exists")
    p.add_argument("--quality", type=int, default=100, help="WebP save quality (100 = lossless-ish)")
    p.add_argument("--lossless", action="store_true", default=True, help="Save WebP as lossless (default on)")
    p.add_argument(
        "--only",
        nargs="*",
        default=None,
        help="Only process files whose name contains one of these substrings",
    )
    p.add_argument(
        "--contact-sheet",
        action="store_true",
        help="After processing, build a single grid image of all outputs for quick visual review",
    )

    cutout_group = p.add_argument_group("cutout mode options")
    cutout_group.add_argument("--model", default=DEFAULT_MODEL, help=f"rembg model name (default: {DEFAULT_MODEL})")
    cutout_group.add_argument(
        "--alpha-matting",
        action="store_true",
        help="Enable alpha matting for softer/cleaner edges (slower, helps messy closeups)",
    )
    cutout_group.add_argument("--fg-threshold", type=int, default=240, help="Alpha matting foreground threshold")
    cutout_group.add_argument("--bg-threshold", type=int, default=10, help="Alpha matting background threshold")
    cutout_group.add_argument("--erode-size", type=int, default=10, help="Alpha matting erode structure size")

    silhouette_group = p.add_argument_group("silhouette mode options")
    silhouette_group.add_argument(
        "--color", default="0,0,0",
        help="Silhouette fill color as 'R,G,B' (default black: 0,0,0)",
    )
    silhouette_group.add_argument(
        "--alpha", type=int, default=255,
        help="Max opacity (0-255) applied on top of the object's existing alpha shape (default 255, fully solid)",
    )

    args = p.parse_args()

    # Fill in mode-specific defaults for anything the user didn't explicitly set.
    defaults = _MODE_DEFAULTS[args.mode]
    if args.input is None:
        args.input = str(defaults["input"])
    if args.output is None:
        args.output = str(defaults["output"])
    if args.suffix is None:
        args.suffix = defaults["suffix"]

    return args


def find_inputs(input_dir: Path, only) -> list[Path]:
    files = sorted(input_dir.glob("*.webp"))
    if only:
        files = [f for f in files if any(tok.lower() in f.stem.lower() for tok in only)]
    return files


def get_rembg_session(model_name: str):
    """Lazily import rembg so --mode silhouette works without it installed."""
    try:
        from rembg import new_session
    except ImportError:
        sys.exit(
            "rembg is not installed (needed for --mode cutout).\n"
            "  py -m pip install \"rembg[cpu]\" pillow      (Windows)\n"
            "  pip install \"rembg[cpu]\" pillow --break-system-packages   (Linux)"
        )
    return new_session(model_name)


def cutout_one(src: Path, dst: Path, session, args) -> tuple[bool, str]:
    try:
        from rembg import remove

        with open(src, "rb") as f:
            input_bytes = f.read()

        result_bytes = remove(
            input_bytes,
            session=session,
            alpha_matting=args.alpha_matting,
            alpha_matting_foreground_threshold=args.fg_threshold,
            alpha_matting_background_threshold=args.bg_threshold,
            alpha_matting_erode_size=args.erode_size,
        )

        img = Image.open(BytesIO(result_bytes)).convert("RGBA")
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, format="WEBP", lossless=args.lossless, quality=args.quality)
        return True, ""
    except Exception as e:  # noqa: BLE001 - we want to keep the batch going no matter what
        return False, f"{type(e).__name__}: {e}"


def make_silhouette(src: Path, dst: Path, args) -> tuple[bool, str]:
    """
    Flatten an already-transparent cutout to a solid color, keeping only the
    object's existing alpha (shape). Background stays fully transparent.
    This is a real pixel-level bake -> nothing left for a client to "undo".
    """
    try:
        r, g, b = (int(c) for c in args.color.split(","))
    except ValueError:
        return False, f"Invalid --color '{args.color}', expected 'R,G,B' e.g. 0,0,0"

    try:
        img = Image.open(src).convert("RGBA")
        alpha = img.split()[3]

        # cap the alpha at --alpha so you can also make a "soft shadow" style
        # silhouette (e.g. --alpha 180) instead of a fully solid one, if wanted.
        if args.alpha < 255:
            alpha = alpha.point(lambda v: min(v, args.alpha))

        flat = Image.new("RGBA", img.size, (r, g, b, 255))
        flat.putalpha(alpha)

        dst.parent.mkdir(parents=True, exist_ok=True)
        flat.save(dst, format="WEBP", lossless=args.lossless, quality=args.quality)
        return True, ""
    except Exception as e:  # noqa: BLE001
        return False, f"{type(e).__name__}: {e}"


def build_contact_sheet(output_dir: Path, processed_paths: list[Path], cols: int = 5, thumb: int = 220):
    if not processed_paths:
        return None
    thumbs = []
    for p in processed_paths:
        try:
            im = Image.open(p).convert("RGBA")
            im.thumbnail((thumb, thumb))
            # paste onto a fixed-size checkered-ish neutral tile so alpha is visible
            tile = Image.new("RGBA", (thumb, thumb), (128, 128, 128, 255))
            x = (thumb - im.width) // 2
            y = (thumb - im.height) // 2
            tile.paste(im, (x, y), im)
            thumbs.append((p.stem, tile))
        except Exception:
            continue

    rows = (len(thumbs) + cols - 1) // cols
    label_h = 22
    sheet = Image.new("RGBA", (cols * thumb, rows * (thumb + label_h)), (20, 20, 20, 255))

    from PIL import ImageDraw
    draw = ImageDraw.Draw(sheet)
    for i, (name, tile) in enumerate(thumbs):
        r, c = divmod(i, cols)
        x, y = c * thumb, r * (thumb + label_h)
        sheet.paste(tile, (x, y))
        draw.text((x + 4, y + thumb + 4), name, fill=(230, 230, 230, 255))

    sheet_path = output_dir / "_contact_sheet.webp"
    sheet.convert("RGB").save(sheet_path, format="WEBP", quality=90)
    return sheet_path


def main():
    args = parse_args()
    input_dir = Path(args.input)
    output_dir = Path(args.output)

    if not input_dir.exists():
        sys.exit(f"Input folder not found: {input_dir}")

    files = find_inputs(input_dir, args.only)
    if not files:
        sys.exit(f"No .webp files found in {input_dir}" + (f" matching {args.only}" if args.only else ""))

    print(f"Mode         : {args.mode}")
    if args.mode == "cutout":
        print(f"Model        : {args.model}")
        print(f"Alpha matting: {'on' if args.alpha_matting else 'off'}")
    else:
        print(f"Fill color   : rgb({args.color})  alpha cap: {args.alpha}")
    print(f"Input        : {input_dir}  ({len(files)} file(s))")
    print(f"Output       : {output_dir}")
    print("-" * 60)

    session = get_rembg_session(args.model) if args.mode == "cutout" else None

    ok, failed, skipped = [], [], []
    t0 = time.time()

    for i, src in enumerate(files, 1):
        dst = output_dir / f"{src.stem}{args.suffix}.webp"
        tag = f"[{i}/{len(files)}] {src.name}"

        if dst.exists() and not args.overwrite:
            print(f"{tag} -> skipped (exists, use --overwrite to redo)")
            skipped.append(dst)
            continue

        if args.mode == "cutout":
            success, err = cutout_one(src, dst, session, args)
        else:
            success, err = make_silhouette(src, dst, args)

        if success:
            print(f"{tag} -> {dst.name}")
            ok.append(dst)
        else:
            print(f"{tag} -> FAILED ({err})")
            failed.append((src, err))

    elapsed = time.time() - t0
    print("-" * 60)
    print(f"Done in {elapsed:.1f}s | ok: {len(ok)}  skipped: {len(skipped)}  failed: {len(failed)}")

    if failed:
        print("\nFailures:")
        for src, err in failed:
            print(f"  - {src.name}: {err}")

    if args.contact_sheet:
        review_set = ok + skipped  # include previously-done files too
        sheet_path = build_contact_sheet(output_dir, review_set)
        if sheet_path:
            print(f"\nContact sheet for quick review: {sheet_path}")


if __name__ == "__main__":
    main()
    
# py src/scripts/cutout_characters.py --mode silhouette --contact-sheet