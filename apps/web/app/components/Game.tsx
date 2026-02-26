"use client";

import React, { useState, useEffect } from "react";
import ChatBox from "./ChatBox";

interface Card {
    rank: string;
    suit: string;
}

interface GameProps {
    playerId: string;
    joinCode: string;
    onLeave: () => void;
}

// Mock showdown players sorted by chip bid (lowest first = revealed first)
const showdownPlayers = [
    { id: "1", name: "Player One", chip: 1, hand: "High Card", cards: [{ rank: "2", suit: "clubs" }, { rank: "7", suit: "spades" }] },
    { id: "2", name: "Player Two", chip: 2, hand: "One Pair", cards: [{ rank: "J", suit: "hearts" }, { rank: "J", suit: "diamonds" }] },
    { id: "3", name: "Player Three", chip: 3, hand: "Two Pair", cards: [{ rank: "A", suit: "spades" }, { rank: "K", suit: "hearts" }] },
    { id: "4", name: "Player Four", chip: 4, hand: "Full House", cards: [{ rank: "Q", suit: "clubs" }, { rank: "Q", suit: "hearts" }] },
    { id: "5", name: "Player Five", chip: 5, hand: "Straight Flush", cards: [{ rank: "9", suit: "spades" }, { rank: "8", suit: "spades" }] },
    { id: "6", name: "Player Six", chip: 6, hand: "Royal Flush", cards: [{ rank: "A", suit: "hearts" }, { rank: "K", suit: "hearts" }] },
];

export default function Game({ playerId, joinCode, onLeave }: GameProps) {
    const [showShowdown, setShowShowdown] = useState(false);
    const [revealedCount, setRevealedCount] = useState(0);

    // Mock State for UI demonstration
    const [vaults, setVaults] = useState("1/3");
    const [alarms, setAlarms] = useState("0/3");
    const [phase, setPhase] = useState("FLOP");

    // When showdown opens, start sequential reveal
    useEffect(() => {
        if (!showShowdown) { setRevealedCount(0); return; }
        setRevealedCount(0);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setRevealedCount(i);
            if (i >= showdownPlayers.length) clearInterval(interval);
        }, 900);
        return () => clearInterval(interval);
    }, [showShowdown]);

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

    const MAX_CHIPS = 6;
    const availableChips = Array.from({ length: MAX_CHIPS }, (_, i) =>
        i < players.length ? String(i + 1) : null
    );

    const phaseColorMap: Record<string, string> = {
        "PRE-FLOP": "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.4)]",
        "FLOP": "bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]",
        "TURN": "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]",
        "RIVER": "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]",
    };
    const currentChipColor = phaseColorMap[phase] ?? "bg-zinc-700 text-zinc-300";

    const getSuitSymbol = (suit: string) => {
        switch (suit) {
            case 'hearts': return '♥';
            case 'spades': return '♠';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            default: return '';
        }
    };

    const renderCardPattern = (card: Card) => {
        const symbol = getSuitSymbol(card.suit);
        const color = card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900';

        if (['A', 'J', 'Q', 'K', '10'].includes(card.rank)) {
            return (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-6xl ${color}`}>{symbol}</span>
                </div>
            );
        }

        const count = parseInt(card.rank);
        if (isNaN(count)) return null;

        const gridClass = count <= 3 ? "flex flex-col" : "grid grid-cols-2";

        return (
            <div className={`absolute inset-0 flex items-center justify-center p-6 ${color}`}>
                <div className={`${gridClass} gap-x-4 gap-y-2`}>
                    {Array.from({ length: count }).map((_, i) => (
                        <span key={i} className="text-xl leading-none">{symbol}</span>
                    ))}
                </div>
            </div>
        );
    };

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
                                    <div className="absolute top-10 right-0 w-80 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl hidden group-hover:block z-50">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Hand Rankings</h4>
                                        <div className="grid text-[10px] gap-y-1.5" style={{ gridTemplateColumns: '1fr auto auto' }}>
                                            {[
                                                { name: "Royal Flush", ex: "A K Q J 10 ♥", rank: "10", gold: true },
                                                { name: "Straight Flush", ex: "5 6 7 8 9 ♠", rank: "9" },
                                                { name: "Four of a Kind", ex: "A A A A K", rank: "8" },
                                                { name: "Full House", ex: "K K K Q Q", rank: "7" },
                                                { name: "Flush", ex: "2 5 7 J A ♦", rank: "6" },
                                                { name: "Straight", ex: "4 5 6 7 8", rank: "5" },
                                                { name: "Three of a Kind", ex: "Q Q Q 7 2", rank: "4" },
                                                { name: "Two Pair", ex: "J J 4 4 9", rank: "3" },
                                                { name: "One Pair", ex: "A A 7 3 K", rank: "2" },
                                                { name: "High Card", ex: "A J 9 5 2", rank: "1", dim: true },
                                            ].map(h => (
                                                <React.Fragment key={h.name}>
                                                    <span className={h.gold ? "font-bold text-yellow-400" : h.dim ? "text-zinc-500" : "text-zinc-300"}>{h.name}</span>
                                                    <span className="text-zinc-600 font-mono mx-3">{h.ex}</span>
                                                    <span className={`font-bold text-right ${h.gold ? "text-yellow-500" : h.dim ? "text-zinc-600" : "text-yellow-500"}`}>{h.rank}</span>
                                                </React.Fragment>
                                            ))}
                                        </div>
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
                                                {p.rounds.map((chip, idx) => {
                                                    const phaseColors: Record<number, string> = {
                                                        0: "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]",
                                                        1: "bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]",
                                                        2: "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]",
                                                        3: "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]",
                                                    };
                                                    const colorClass = chip ? (phaseColors[idx] ?? "bg-zinc-700 text-zinc-300") : "bg-transparent border-dashed";
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-[10px] font-bold ${colorClass}`}
                                                        >
                                                            {chip === "Free" ? "F" : chip}
                                                        </div>
                                                    );
                                                })}
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
                                <div className="flex-1 flex items-center justify-center gap-1">
                                    {communityCards.map((card, idx) => (
                                        <div key={idx} className={`w-28 h-40 rounded-xl transition-all duration-700 ${card ? 'bg-white shadow-[0_15px_30px_rgba(0,0,0,0.5)]' : 'bg-zinc-800 border-2 border-dashed border-zinc-700 scale-95'}`}>
                                            {card && (
                                                <div className="p-2 h-full flex flex-col justify-between text-black font-black italic relative overflow-hidden">
                                                    <div className={`text-xl leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-base">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                    {renderCardPattern(card)}
                                                    <div className={`text-xl leading-none self-end rotate-180 ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-base">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Middle Action Bar */}
                                <div className="h-24 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex items-center justify-end px-8 relative">

                                    {/* Active Selection Display – centered */}
                                    <div className="absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-dashed border-zinc-700 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(220,38,38,0.5)]">2</div>
                                    </div>

                                    {/* Vote Button – right corner */}
                                    <div className="flex flex-col items-end gap-1">
                                        <button className="px-4 py-2 bg-green-700 hover:bg-green-600 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-[0_0_12px_rgba(22,163,74,0.3)]">
                                            Start Vote ▶
                                        </button>
                                        <span className="text-[10px] font-bold text-zinc-500">Votes: 1 / 3</span>
                                    </div>
                                </div>

                                {/* Bottom Player Area */}
                                <div className="h-48 bg-zinc-950 flex flex-col justify-end p-8 relative">

                                    {/* Chip Pool – repositioned */}
                                    <div className="absolute left-8 -top-24">
                                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Available Chips</div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {availableChips.map((chip, idx) => (
                                                <div key={idx} className="flex flex-col items-center gap-1">
                                                    {chip !== null ? (
                                                        <button className={`w-12 h-12 rounded-full border-2 border-transparent flex items-center justify-center text-sm font-black transition-all hover:scale-110 active:scale-90 ${currentChipColor}`}>
                                                            {chip}
                                                        </button>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center opacity-40" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hand Cards (Centered) */}
                                    <div className="flex justify-center gap-2 -mb-20">
                                        {myCards.map((card, idx) => (
                                            <div key={idx} className="w-24 h-36 bg-white rounded-lg shadow-2xl transition-all hover:-translate-y-8 cursor-pointer relative overflow-hidden group">
                                                <div className="p-2 h-full flex flex-col justify-between text-black font-black italic">
                                                    <div className={`text-base leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-xs">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                    {renderCardPattern(card)}
                                                    <div className={`text-base leading-none self-end rotate-180 ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                        {card.rank}<br />
                                                        <span className="text-xs">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                </div>
                                                {/* Shimmer Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                            </div>
                                        ))}
                                    </div>

                                </div>

                            </div>
                        </div>
                    </main>

                    <ChatBox className="w-80" joinCode={joinCode} />

                </div>
            </div>

            {/* ── SHOWDOWN OVERLAY ─────────────────────────────────── */}
            {showShowdown && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 gap-6 overflow-hidden">

                    {/* Header */}
                    <header className="flex items-center justify-between shrink-0">
                        <h2 className="text-4xl font-black italic bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent tracking-tighter">
                            FINAL SHOWDOWN
                        </h2>
                        <button
                            onClick={() => setShowShowdown(false)}
                            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all"
                        >
                            Close Results
                        </button>
                    </header>

                    {/* 6-card grid – all fit in one row */}
                    <div className="flex-1 grid gap-3 items-stretch" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                        {showdownPlayers.map((p, idx) => {
                            const revealed = idx < revealedCount;
                            const isWinner = idx === showdownPlayers.length - 1;
                            return (
                                <div
                                    key={p.id}
                                    className="relative"
                                    style={{ perspective: '800px' }}
                                >
                                    {/* Card wrapper – flips on reveal */}
                                    <div
                                        className="w-full h-full transition-transform duration-700"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transform: revealed ? 'rotateY(0deg)' : 'rotateY(90deg)',
                                        }}
                                    >
                                        <div className={`
                                            w-full h-full rounded-2xl border flex flex-col p-4 gap-3 shadow-2xl
                                            ${isWinner && revealed
                                                ? 'bg-yellow-950/60 border-yellow-500/60 shadow-yellow-500/20'
                                                : 'bg-zinc-900/70 border-zinc-800'
                                            }
                                        `}>
                                            {/* Rank badge */}
                                            <div className={`
                                                self-start px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest
                                                ${isWinner ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}
                                            `}>
                                                Chip {p.chip}
                                            </div>

                                            {/* Player name */}
                                            <div className="font-black text-sm uppercase tracking-tight truncate text-white">
                                                {p.name}
                                            </div>

                                            {/* Community cards (river) */}
                                            <div className="flex gap-1 justify-center">
                                                {communityCards.map((card, ci) => (
                                                    <div key={ci} className={`w-8 h-11 rounded flex-shrink-0 relative overflow-hidden ${card ? 'bg-white shadow' : 'bg-zinc-800 border border-dashed border-zinc-700'}`}>
                                                        {card && (
                                                            <>
                                                                <div className={`absolute top-0.5 left-0.5 text-[7px] font-black leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                                    {card.rank}
                                                                </div>
                                                                <div className={`absolute inset-0 flex items-center justify-center text-sm ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-zinc-800'}`}>
                                                                    {getSuitSymbol(card.suit)}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Hand cards */}
                                            <div className="flex gap-1.5 justify-center items-center">
                                                {p.cards.map((card, ci) => (
                                                    <div key={ci} className="w-14 h-20 bg-white rounded-lg shadow-xl relative overflow-hidden flex-shrink-0">
                                                        {/* Top corner */}
                                                        <div className={`absolute top-1 left-1 text-xs font-black leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                            {card.rank}<br />
                                                            <span className="text-[9px]">{getSuitSymbol(card.suit)}</span>
                                                        </div>
                                                        {/* Center symbol */}
                                                        <div className={`absolute inset-0 flex items-center justify-center text-3xl ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500 opacity-20' : 'text-zinc-800 opacity-15'}`}>
                                                            {getSuitSymbol(card.suit)}
                                                        </div>
                                                        {/* Bottom corner */}
                                                        <div className={`absolute bottom-1 right-1 rotate-180 text-xs font-black leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                                            {card.rank}<br />
                                                            <span className="text-[9px]">{getSuitSymbol(card.suit)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Hand name */}
                                            <div className={`text-center text-xs font-black uppercase tracking-widest ${isWinner ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                                {p.hand}
                                            </div>

                                            {/* Winner crown */}
                                            {isWinner && revealed && (
                                                <div className="text-center text-2xl animate-bounce">👑</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Still-hidden back face */}
                                    {!revealed && (
                                        <div className="absolute inset-0 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                                            <span className="text-5xl opacity-20">🂠</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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

            {/* Leave Game Button */}
            <button
                onClick={onLeave}
                className="fixed bottom-4 right-4 z-40 px-3 py-1 bg-zinc-800 text-[8px] font-bold text-zinc-500 rounded uppercase tracking-widest hover:text-red-500 transition-colors"
            >
                Leave Game
            </button>
        </div>
    );
}

