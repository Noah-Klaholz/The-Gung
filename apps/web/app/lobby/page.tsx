"use client";

import { useRouter } from "next/navigation";

export default function LobbyPage() {
    const router = useRouter();

    const handleCreateLobby = () => {
        console.log("Create Lobby clicked");
        // router.push('/create-lobby'); // Optional future route
    };

    const handleJoinLobby = () => {
        console.log("Join Lobby clicked");
        // router.push('/join-lobby'); // Optional future route
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-sans">
            <div className="w-full max-w-sm p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
                <h1 className="text-4xl font-bold text-white text-center mb-8 uppercase tracking-wider">
                    The Gang
                </h1>

                <div className="space-y-4">
                    <button
                        onClick={handleCreateLobby}
                        className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors uppercase tracking-wider text-sm"
                    >
                        Create Lobby
                    </button>

                    <button
                        onClick={handleJoinLobby}
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
            </div>
        </div>
    );
}
