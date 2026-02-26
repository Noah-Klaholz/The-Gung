"use client";

import React, { useState, useEffect } from "react";
import { socket } from "../../lib/socket";

interface Card {
    rank: string;
    suit: string;
}

interface GameProps {
    playerId: string;
    joinCode: string;
    onLeave: () => void;
}

export default function Game({ playerId, joinCode, onLeave }: GameProps) {
    const [showShowdown, setShowShowdown] = useState(false);

    // Mock State for UI demonstration
    const [vaults, setVaults] = useState("1/3");
    const [alarms, setAlarms] = useState("0/3");
    const [phase, setPhase] = useState("FLOP");

    // Dummy data for visual representation
    const communityCards: (Card | null)[] = [
        { rank: "A", suit: "hearts" },
        { rank: "10", suit: "spades" },
        { rank: "J", suit: "hearts" },
        null,
        null
    ];

    const myCards: Card[] = [
        { rank: "Q", suit: "hearts" },
        { rank: "K", suit: "hearts" }
    ];

    const players = [
        { id: "1", name: "Player One", rounds: ["1", "Free", "", ""] },
        { id: "2", name: "Player Two", rounds: ["2", "1", "", ""] },
        { id: "3", name: "Player Three", rounds: ["Free", "2", "", ""] },
    ];

    const availableChips = ["2", "1", "Free", "Free", "Free", "Free"];

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_var(--tw-gradient-via)_40%,_black_100%)] from-zinc-800 via-zinc-950 opacity-100 z-0" />

            {/* Main Container */}
            <div className="relative z-10 w-full max-w-[1450px] h-[95vh] flex flex-col gap-4">

                {/* HEADER SECTION */}
                <header className="flex items-center justify-between h-20 px-6">
                    <div className="text-3xl font-black bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent tracking-tighter italic">
                        THE GUNG
                    </div>

                    <div className="w-32" /> {/* Spacer */}
                </header>

                {/* MAIN GAME AREA */}
                <div className="flex-1 flex gap-4 overflow-hidden">

                    {/* GAME BOARD */}
                    <main className="flex-1 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">

                        {/* Top Campaign Bar */}
                        <div className="h-16 bg-zinc-900 flex items-center justify-between px-8 border-b border-zinc-800">
                            <div className="flex gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Vaults:</span>
                                    <span className="text-yellow-500 font-black drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">{vaults}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Alarms:</span>
                                    <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">{alarms}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="px-4 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-black tracking-[0.2em]">
                                    PHASE: <span className="text-yellow-500">{phase}</span>
                                </div>
                                <div className="relative group">
                                    <button className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-zinc-700">?</button>
                                    <div className="absolute top-10 right-0 w-64 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl hidden group-hover:block z-50">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Cheat Sheet</h4>
                                        <ul className="text-[10px] space-y-1 text-zinc-300">
                                            <li className="flex justify-between"><span>Royal Flush</span> <span className="text-yellow-500">10</span></li>
                                            <li className="flex justify-between"><span>Straight Flush</span> <span className="text-yellow-500">9</span></li>
                                            <li className="flex justify-between"><span>Four of a Kind</span> <span className="text-yellow-500">8</span></li>
                                            <li className="flex justify-between"><span>Full House</span> <span className="text-yellow-500">7</span></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">

                            {/* Left Sidebar: Chip History */}
                            <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col">
                                <div className="p-4 border-b border-zinc-900 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    Player Logistics
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {players.map(p => (
                                        <div key={p.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                            <div className="text-xs font-bold mb-3 truncate">{p.name}</div>
                                            <div className="flex gap-2">
                                                {p.rounds.map((chip, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-[10px] font-bold ${chip === "1" ? "bg-white text-black shadow-[0_0_10px_white]" :
                                                                chip === "2" ? "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,1)]" :
                                                                    chip === "Free" ? "bg-zinc-700 text-zinc-300" : "bg-transparent"
                                                            }`}
                                                    >
                                                        {chip === "Free" ? "F" : chip}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </aside>

                            {/* Center: The Heist */}
                            <div className="flex-1 relative flex flex-col">

                                {/* Table Background */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,83,45,0.2)_0%,_transparent_70%)] pointer-events-none" />

                                {/* Community Cards */}
                                <div className="flex-1 flex items-center justify-center gap-4">
                                    {communityCards.map((card, idx) => (
                                        <div key={idx} className={`w-28 h-40 rounded-xl transition-all duration-700 ${card ? 'bg-white shadow-[0_15px_30px_rgba(0,0,0,0.5)] rotate-0 scale-100' : 'bg-zinc-800 border-2 border-dashed border-zinc-700 -rotate-2 scale-95'}`}>
                                            {card && (
                                                <div className="p-2 h-full flex flex-col justify-between text-black font-black italic relative overflow-hidden">
                                                    <div className={`text-xl leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-base">{card.suit === 'hearts' ? '♥' : card.suit === 'spades' ? '♠' : card.suit === 'diamonds' ? '♦' : '♣'}</span>
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-10">
                                                        {card.suit === 'hearts' ? '♥' : card.suit === 'spades' ? '♠' : card.suit === 'diamonds' ? '♦' : '♣'}
                                                    </div>
                                                    <div className={`text-xl leading-none self-end rotate-180 ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-base">{card.suit === 'hearts' ? '♥' : card.suit === 'spades' ? '♠' : card.suit === 'diamonds' ? '♦' : '♣'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Middle Action Bar */}
                                <div className="h-32 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex items-center justify-between px-12 relative">

                                    {/* Timer Banner */}
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-1 bg-red-600 animate-pulse rounded-full text-[10px] font-black tracking-widest text-white shadow-xl flex items-center gap-2">
                                        ⏳ FORCED ADVANCE IN: 12s
                                    </div>

                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                        Your Selection
                                    </div>

                                    {/* Active Selection Display */}
                                    <div className="w-20 h-20 rounded-full border-4 border-dashed border-zinc-700 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-2xl font-black shadow-[0_0_20px_rgba(220,38,38,0.5)]">2</div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <button className="px-8 py-3 bg-green-600 hover:bg-green-500 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                                            Start Vote to Advance
                                        </button>
                                        <span className="text-[10px] font-bold text-zinc-500">Votes: 1 / 3</span>
                                    </div>
                                </div>

                                {/* Bottom Player Area */}
                                <div className="h-48 bg-zinc-950 flex flex-col justify-end p-8 relative">

                                    {/* Chip Pool (Left) */}
                                    <div className="absolute left-8 bottom-8">
                                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Available Chips</div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {availableChips.map((chip, idx) => (
                                                <div key={idx} className="flex flex-col items-center gap-1">
                                                    <button className={`w-12 h-12 rounded-full border-2 border-zinc-800 flex items-center justify-center text-sm font-black transition-all hover:scale-110 active:scale-90 ${chip === '2' ? 'bg-red-600 text-white cursor-not-allowed opacity-50' :
                                                            chip === '1' ? 'bg-white text-black underline decoration-red-500' : 'bg-transparent border-dashed text-zinc-500 hover:border-zinc-500'
                                                        }`}>
                                                        {chip === 'Free' ? 'F' : chip}
                                                    </button>
                                                    <span className="text-[8px] font-black text-zinc-700 uppercase">{chip === '2' ? 'Player Two' : 'FREE'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hand Cards (Centered) */}
                                    <div className="flex justify-center gap-2 -mb-4">
                                        {myCards.map((card, idx) => (
                                            <div key={idx} className="w-24 h-36 bg-white rounded-lg shadow-2xl transition-all hover:-translate-y-8 cursor-pointer relative overflow-hidden group">
                                                <div className="p-2 h-full flex flex-col justify-between text-black font-black italic">
                                                    <div className={`text-base leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-xs">{card.suit === 'hearts' ? '♥' : card.suit === 'spades' ? '♠' : card.suit === 'diamonds' ? '♦' : '♣'}</span>
                                                    </div>
                                                    <div className={`text-base leading-none self-end rotate-180 ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-xs">{card.suit === 'hearts' ? '♥' : card.suit === 'spades' ? '♠' : card.suit === 'diamonds' ? '♦' : '♣'}</span>
                                                    </div>
                                                </div>
                                                {/* Shimmer Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Hand Descriptor */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full shadow-lg shadow-black/50">
                                        <span className="text-[10px] font-black tracking-widest text-zinc-400">BEST HAND: </span>
                                        <span className="text-[10px] font-bold text-yellow-500 tracking-wider">ACE HIGH FLUSH</span>
                                    </div>

                                    {/* Debug Info (Right) */}
                                    <div className="absolute right-8 bottom-3 text-[10px] font-mono text-zinc-800 uppercase tabular-nums">
                                        SID: {playerId.slice(0, 8)} | v1.0.4-gung
                                    </div>
                                </div>

                            </div>
                        </div>
                    </main>

                    {/* CHAT BOX */}
                    <section className="w-80 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
                        <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center px-6">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Comms channel</span>
                            <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                            <div className="self-start max-w-[80%] bg-zinc-900 p-3 rounded-2xl rounded-tl-none border border-zinc-800">
                                <div className="text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-tighter">System</div>
                                <p className="text-xs text-zinc-300">Heist initiated. Good luck team.</p>
                            </div>

                            <div className="self-end max-w-[80%] bg-zinc-800 p-3 rounded-2xl rounded-tr-none border border-zinc-700">
                                <p className="text-xs text-white">I've got the King, playing for Flush.</p>
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                            <form className="relative flex items-center" onSubmit={(e) => e.preventDefault()}>
                                <input
                                    type="text"
                                    placeholder="Send data..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-zinc-600 transition-colors"
                                />
                                <button className="absolute right-2 text-zinc-500 hover:text-white transition-colors">➔</button>
                            </form>
                        </div>
                    </section>

                </div>
            </div>

            {/* SHOWDOWN OVERLAY (Modal) */}
            {showShowdown && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-8 overflow-hidden animate-in fade-in duration-500">
                    <div className="w-full max-w-6xl h-full flex flex-col">
                        <header className="h-20 flex items-center justify-between border-b border-zinc-800">
                            <h2 className="text-4xl font-black italic bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent tracking-tighter">FINAL SHOWDOWN</h2>
                            <button onClick={() => setShowShowdown(false)} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all">
                                Close Results
                            </button>
                        </header>

                        <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-6 px-12 pb-12">
                            {/* Showdown Result Cards */}
                            {[1, 2, 3].map(rank => (
                                <div key={rank} className="min-w-[300px] h-[500px] bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex flex-col relative group transition-all hover:border-yellow-500/50 hover:bg-zinc-900 shadow-2xl">
                                    <div className={`absolute -top-4 -left-4 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-2xl rotate-[-12deg] border-2 ${rank === 1 ? 'bg-red-600 border-red-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                        #{rank}
                                    </div>
                                    <div className="text-right text-xs font-black text-zinc-500 uppercase tracking-widest mb-12">
                                        BID: <span className="text-white">2 CHIPS</span>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1">Player Name</div>
                                        <div className="text-2xl font-black text-white italic truncate">PLAYER {rank}</div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center items-center">
                                        <div className="text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.3em] mb-4">EVALUATED HAND</div>
                                        <div className="text-2xl font-black text-yellow-500 text-center uppercase tracking-tighter leading-none mb-8">
                                            ACE HIGH<br />FLUSH
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <div className="w-12 h-18 bg-white/10 rounded border border-white/20"></div>
                                        <div className="w-12 h-18 bg-white/10 rounded border border-white/20"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Button to toggle showdown UI for testing */}
            <button
                onClick={() => setShowShowdown(true)}
                className="fixed top-4 right-4 z-40 px-3 py-1 bg-zinc-800 text-[8px] font-bold text-zinc-500 rounded uppercase tracking-widest hover:text-white transition-colors"
            >
                Debug Overlay
            </button>

            {/* Leave Lobby Button */}
            <button
                onClick={onLeave}
                className="fixed bottom-4 left-4 z-40 px-3 py-1 bg-zinc-800 text-[8px] font-bold text-zinc-500 rounded uppercase tracking-widest hover:text-red-500 transition-colors"
            >
                Leave Game
            </button>
        </div>
    );
}
