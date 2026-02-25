"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [name, setName] = useState("");
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            console.log("Joined as:", name);
            router.push('/lobby');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-sans">
            <div className="w-full max-w-sm p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
                <h1 className="text-4xl font-bold text-white text-center mb-8 uppercase tracking-wider">
                    The Gung
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nameInput" className="block text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
                            Name
                        </label>
                        <input
                            id="nameInput"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                            placeholder="Dein Name..."
                            required
                            autoComplete="off"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm mt-2"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
