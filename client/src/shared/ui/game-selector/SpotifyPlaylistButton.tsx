// src/shared/ui/button/SpotifyPlaylistButton.tsx
"use client";

import { Tooltip } from "@/src/shared/ui/tooltip";

const PLAYLIST_URL = "https://open.spotify.com/playlist/666bWxQT9HezzdEtBG1Ae0?si=983f4bc414644adb";

export function SpotifyPlaylistButton() {
    return (
        <Tooltip content="Bleachdle Playlist">
            <a
                href={PLAYLIST_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the Bleachdle playlist on Spotify"
                className="group/btn relative w-10 h-10 flex items-center justify-center text-[#1DB954] hover:text-[#3ee881] transition-colors duration-300"
            >
                {/* ✨ Tech Target Brackets — โทนเขียว Spotify แทนสีเดิมของปุ่มอื่น */}
                <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#1DB954]" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#1DB954]" />
                </div>

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:-translate-y-0.5 group-hover/btn:scale-105 drop-shadow-[0_0_0px_rgba(29,185,84,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(29,185,84,0.6)]"
                >
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.3.1-.7-.1-.8-.5-.1-.3.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.7c-.2.4-.7.5-1.1.3-2.8-1.7-7.1-2.2-10.4-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.8-1.2 8.5-.6 11.7 1.3.4.2.5.7.3 1.1zm.1-2.8C14.3 8.9 8.9 8.7 5.7 9.7c-.5.2-1-.1-1.2-.6-.2-.5.1-1 .6-1.2 3.7-1.1 9.7-.9 13.5 1.4.5.3.6.9.3 1.4-.3.4-.9.5-1.3.2z" />
                </svg>
            </a>
        </Tooltip>
    );
}