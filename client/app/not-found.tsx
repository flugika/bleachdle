// app/not-found.tsx
//
// Next.js renders this automatically for any path that doesn't match a
// route, and correctly returns HTTP 404 — unlike a [...catchAll] page,
// which "matches" successfully and returns 200 even though nothing real
// was found there.
import Sealed from "@/src/shared/ui/Sealed";

export default function NotFound() {
    return <Sealed />;
}