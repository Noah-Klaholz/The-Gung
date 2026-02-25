"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- TYPES ---
// Replace or extend these types based on your backend State Manager
interface Player {
    id: string;
    name: string;
    isReady: boolean;
}

export default function LobbyWaitingRoom({ params }: { params: Promise<{ lobbyId: string }> }) {
    const router = useRouter();

    const resolvedParams = use(params);
    const lobbyId = resolvedParams.lobbyId;

    // --- STATE ---
    // In the future, this should be synced with your backend via Socket.IO)
    const [players, setPlayers] = useState<Player[]>([
        { id: "1", name: "Lade...", isReady: false },
        // Dummy players to show how it looks
        { id: "2", name: "Player 2", isReady: true },
        { id: "3", name: "Player 3", isReady: false },
    ]);
    const [copied, setCopied] = useState(false);

    // Fetch the player name from localStorage when the component mounts
    useEffect(() => {
        const storedName = localStorage.getItem("playerName");
        if (storedName) {
            setPlayers(prev => prev.map((p, index) =>
                index === 0 ? { ...p, name: `${storedName} (Du)` } : p
            ));
        } else {
            setPlayers(prev => prev.map((p, index) =>
                index === 0 ? { ...p, name: "Unbekannter Spieler (Du)" } : p
            ));
        }
    }, []);

    const isCurrentUserReady = players[0]?.isReady ?? false;

    // --- HANDLERS ---
    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(lobbyId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code", err);
        }
    };

    const handleToggleReady = () => {
        // TODO: Emit a Socket.IO event here to tell the server the player's new ready state.
        // socket.emit('player_ready', { isReady: !isCurrentUserReady });

        // For frontend demonstration purposes only:
        setPlayers((prev) =>
            prev.map((p, index) =>
                index === 0 ? { ...p, isReady: !p.isReady } : p
            )
        );
    };

    const handleLeaveLobby = () => {
        // TODO: Emit event to server before leaving
        // socket.emit('leave_lobby');
        router.push("/lobby");
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans p-4 relative">

            {/* Top Right: Lobby Code Container */}
            <div className="absolute top-6 right-6 flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-2 shadow-lg">
                <button
                    onClick={handleCopyCode}
                    className="mr-3 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded transition-colors focus:outline-none"
                    aria-label="Copy lobby code"
                    title={copied ? "Copied!" : "Copy code"}
                >
                    {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
                <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Lobby Code</span>
                    <span className="text-white font-mono tracking-wider font-semibold text-lg">{lobbyId}</span>
                </div>
            </div>

            {/* Main Content Box */}
            <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-xl mt-16">
                <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wider">
                    Waiting Room
                </h1>

                {/* Player List */}
                <div className="space-y-3 mb-8">
                    <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">
                        Players ({players.length}/4) {/* Update max players if necessary */}
                    </h2>

                    <div className="flex flex-col gap-2">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between p-3 bg-black border border-neutral-800 rounded-lg"
                            >
                                <span className="text-white font-medium">{player.name}</span>
                                <span className={`text-xs uppercase font-bold tracking-wider px-2 py-1 rounded ${player.isReady
                                    ? "text-green-500 bg-green-500/10 border border-green-500/20"
                                    : "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"
                                    }`}>
                                    {player.isReady ? "Ready" : "Waiting"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    <button
                        onClick={handleToggleReady}
                        className={`w-full py-4 px-4 font-bold rounded-lg transition-colors uppercase tracking-widest ${isCurrentUserReady
                            ? "bg-green-600 hover:bg-green-500 text-white"
                            : "bg-white hover:bg-neutral-200 text-black"
                            }`}
                    >
                        {isCurrentUserReady ? "Not Ready" : "Ready"}
                    </button>

                    <button
                        onClick={handleLeaveLobby}
                        className="w-full py-2 px-4 bg-transparent text-neutral-500 hover:text-red-400 transition-colors uppercase tracking-wider text-xs font-medium border border-transparent hover:border-red-400/30 rounded"
                    >
                        Leave Lobby
                    </button>

                    {/* TODO: Add a Start Game button for the lobby host once everyone is ready */}
                    {/* 
                    <button
                        disabled={!allPlayersReady}
                        onClick={handleStartGame}
                        ... 
                    >
                        Start Game
                    </button>
                    */}
                </div>
            </div>
        </div>
    );
}
