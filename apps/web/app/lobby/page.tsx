"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "../../lib/socket";
import { usePlayer } from "../../lib/context/playerContext"

const { playerName, setLobbyId } = usePlayer();

export default function LobbyPage() {
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const [joinCode, setJoinCode] = useState("");

    const handleCreateLobby = () => {
        console.log("Create Lobby clicked");
        socket.emit("CREATE_LOBBY", { playerName }); 
    };

    const handleJoinLobby = () => {
        console.log("Join Lobby clicked");
        socket.emit("JOIN_LOBBY", { playerName });
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-sans">
            <div className="w-full max-w-sm p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
                <h1 className="text-4xl font-bold text-white text-center mb-8 uppercase tracking-wider">
                    The Gung
                </h1>

                {!isJoining ? (
                    <div className="space-y-4">
                        <button
                            onClick={handleCreateLobby}
                            className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors uppercase tracking-wider text-sm"
                        >
                            Create Lobby
                        </button>

                        <button
                            onClick={() => setIsJoining(true)}
                            className="w-full py-3 px-4 bg-neutral-800 text-white font-semibold rounded-lg hover:bg-neutral-700 transition-colors border border-neutral-700 uppercase tracking-wider text-sm"
                        >
                            Join Lobby
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-2 px-4 mt-4 bg-transparent text-neutral-400 font-medium hover:text-white transition-colors uppercase tracking-wider text-xs underline underline-offset-4"
                        >
                            Back
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleJoinSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="joinCode" className="block text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
                                Lobby Code
                            </label>
                            <input
                                id="joinCode"
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600 font-mono tracking-wider"
                                placeholder="z.B. 123456"
                                required
                                autoComplete="off"
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={!joinCode.trim()}
                                className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm mt-2"
                            >
                                Join
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsJoining(false)}
                                className="w-full py-2 px-4 bg-transparent text-neutral-400 font-medium hover:text-white transition-colors uppercase tracking-wider text-xs underline underline-offset-4"
                            >
                                Abbrechen
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
