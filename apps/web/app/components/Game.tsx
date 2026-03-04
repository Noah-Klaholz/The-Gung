"use client";

import React, { useState, useEffect, useCallback } from "react";
import ChatBox from "./ChatBox";
import { socket } from "../../lib/socket";
import { CARD_SKINS, TABLE_SKINS, type CardSkin, type TableSkin } from "../../lib/skins";
import { usePlayer } from "../../lib/context/playerContext";

interface Card {
    rank: string;
    suit: string;
}

interface PlayerChips {
    white: number | null;
    yellow: number | null;
    orange: number | null;
    red: number | null;
}

interface GamePlayerState {
    id: string;
    name: string;
    chips: PlayerChips;
    lockedIn: boolean;
}

interface ShowdownPlayerResult {
    playerId: string;
    playerName: string;
    redChip: number;
    handName: string;
    handDescription: string;
    bestHandCards: string[];
    trueRank: number;
}

interface HeistResult {
    heistNumber: number;
    success: boolean;
    orderedShowdown: ShowdownPlayerResult[];
    successes: number;
    failures: number;
}

interface GameProps {
    playerId: string;
    joinCode: string;
    onLeave: () => void;
    cardSkin: CardSkin;
    tableSkin: TableSkin;
}

// Convert backend card format (suit: "h"/"d"/"c"/"s", rank: "T") to frontend format
function convertCard(card: any): Card | null {
    if (!card) return null;
    const suitMap: Record<string, string> = { h: "hearts", d: "diamonds", c: "clubs", s: "spades" };
    const rank = card.rank === "T" ? "10" : card.rank;
    const suit = suitMap[card.suit] ?? card.suit;
    return { rank, suit };
}

export default function Game({ playerId, joinCode, onLeave, cardSkin, tableSkin }: GameProps) {
    const { players: lobbyPlayers } = usePlayer();

    // Server-driven state
    const [phase, setPhase] = useState("PRE-FLOP");
    const [communityCards, setCommunityCards] = useState<(Card | null)[]>([null, null, null, null, null]);
    const [myCards, setMyCards] = useState<Card[]>([]);
    const [players, setPlayers] = useState<GamePlayerState[]>([]);
    const [roundChips, setRoundChips] = useState<number[]>([]);
    const [successes, setSuccesses] = useState(0);
    const [failures, setFailures] = useState(0);
    const [heistNumber, setHeistNumber] = useState(0);

    // Heist result / Showdown state
    const [showShowdown, setShowShowdown] = useState(false);
    const [heistResult, setHeistResult] = useState<HeistResult | null>(null);
    const [revealedCount, setRevealedCount] = useState(0);
    const [revealPhase, setRevealPhase] = useState<"idle" | "intro" | "revealing" | "impact">("idle");
    const [resultBurst, setResultBurst] = useState<"success" | "alarm" | null>(null);
    const [showImpactFlash, setShowImpactFlash] = useState(false);

    // Game over state
    const [gameOver, setGameOver] = useState<{ won: boolean; successes: number; failures: number } | null>(null);

    // Socket listeners
    useEffect(() => {
        const handleGameUpdate = (data: any) => {
            const pub = data.publicState;
            const priv = data.privateState;

            if (pub) {
                setPhase((pub.phase ?? "pre-flop").toUpperCase());
                setSuccesses(pub.successes ?? 0);
                setFailures(pub.failures ?? 0);
                setHeistNumber(pub.heistNumber ?? 0);
                setRoundChips(pub.roundChips ?? []);

                // Community cards: backend sends Card[] (already sliced), pad to 5
                const visible = (pub.communityCards ?? []).map((c: any) => convertCard(c));
                const padded: (Card | null)[] = [...visible];
                while (padded.length < 5) padded.push(null);
                setCommunityCards(padded);

                setPlayers((pub.players ?? []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    chips: p.chips ?? { white: null, yellow: null, orange: null, red: null },
                    lockedIn: p.lockedIn ?? false,
                })));
            }

            if (priv) {
                setMyCards((priv.hand ?? []).map((c: any) => convertCard(c)).filter(Boolean) as Card[]);
            }
        };

        const handleHeistResult = (data: HeistResult) => {
            setHeistResult(data);
            setShowShowdown(true);
        };

        const handleGameEnded = (data: any) => {
            setGameOver(data);
        };

        socket.on("GAME_UPDATE", handleGameUpdate);
        socket.on("HEIST_RESULT", handleHeistResult);
        socket.on("GAME_ENDED", handleGameEnded);
        socket.emit("REQUEST_GAME_STATE", { joinCode });

        return () => {
            socket.off("GAME_UPDATE", handleGameUpdate);
            socket.off("HEIST_RESULT", handleHeistResult);
            socket.off("GAME_ENDED", handleGameEnded);
        };
    }, [joinCode, playerId]);

    // Sequential reveal animation for showdown
    useEffect(() => {
        if (!showShowdown || !heistResult) {
            setRevealedCount(0);
            setRevealPhase("idle");
            setResultBurst(null);
            setShowImpactFlash(false);
            return;
        }

        setRevealedCount(0);
        setRevealPhase("intro");
        setResultBurst(null);
        setShowImpactFlash(false);

        const timers: Array<ReturnType<typeof setTimeout>> = [];
        let revealInterval: ReturnType<typeof setInterval> | null = null;

        const introTimer = setTimeout(() => {
            setRevealPhase("revealing");
            let i = 0;
            const total = heistResult.orderedShowdown.length;

            revealInterval = setInterval(() => {
                i += 1;
                setRevealedCount(i);

                if (i >= total) {
                    if (revealInterval) clearInterval(revealInterval);

                    const impactTimer = setTimeout(() => {
                        setRevealPhase("impact");
                        setResultBurst(heistResult.success ? "success" : "alarm");
                        setShowImpactFlash(true);

                        const flashTimer = setTimeout(() => setShowImpactFlash(false), 750);
                        timers.push(flashTimer);
                    }, 500);

                    timers.push(impactTimer);
                }
            }, 650);
        }, 500);

        timers.push(introTimer);

        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            if (revealInterval) clearInterval(revealInterval);
        };
    }, [showShowdown, heistResult]);

    // Chip actions — direct one-click
    const handleTakeChip = (chipValue: number) => {
        // Check if the chip is owned by another player
        const owner = players.find(p => p.chips[currentColor] === chipValue);
        if (owner && owner.id !== playerId) {
            // Steal from player
            socket.emit("CHIP_ACTION", {
                joinCode,
                playerId,
                action: { type: "take_player", fromPlayerId: owner.id },
            });
        } else if (!owner) {
            // Take from center
            socket.emit("CHIP_ACTION", {
                joinCode,
                playerId,
                action: { type: "take_center", star: chipValue },
            });
        }
    };

    const handleReturnChip = () => {
        socket.emit("CHIP_ACTION", {
            joinCode,
            playerId,
            action: { type: "return_own" },
        });
    };

    const handleToggleLockIn = () => {
        socket.emit("CHIP_ACTION", {
            joinCode,
            playerId,
            action: { type: "toggle_lock_in" },
        });
    };

    // Get current player's chip for the current color
    const chipColors: ("white" | "yellow" | "orange" | "red")[] = ["white", "yellow", "orange", "red"];
    const phaseToColor: Record<string, "white" | "yellow" | "orange" | "red"> = {
        "PRE-FLOP": "white",
        "FLOP": "yellow",
        "TURN": "orange",
        "RIVER": "red",
    };
    const currentColor = phaseToColor[phase] ?? "white";
    const myPlayerState = players.find(p => p.id === playerId);
    const myCurrentChip = myPlayerState?.chips[currentColor] ?? null;
    const myLockedIn = myPlayerState?.lockedIn ?? false;
    const totalPlayers = players.length;

    // Get chip owner for the Available Bids grid
    const getChipOwner = (val: number) => {
        return players.find(p => p.chips[currentColor] === val);
    };

    // UI Helpers
    const phaseColorMap: Record<string, string> = {
        "PRE-FLOP": "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.4)]",
        "FLOP": "bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]",
        "TURN": "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]",
        "RIVER": "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]",
    };
    const currentChipColor = phaseColorMap[phase] ?? "bg-zinc-700 text-zinc-300";

    const activeTableSkin = TABLE_SKINS[tableSkin];
    const activeCardSkin = CARD_SKINS[cardSkin];

    const getSuitColorClass = (suit: string) => {
        const isRedSuit = suit === "hearts" || suit === "diamonds";
        return isRedSuit ? activeCardSkin.suitRedClass : activeCardSkin.suitBlackClass;
    };

    const getSuitSymbol = (suit: string) => {
        switch (suit) {
            case 'hearts': return '♥';
            case 'spades': return '♠';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            default: return '';
        }
    };

    const formatShowdownCard = (solverCard: string) => {
        if (!solverCard || solverCard.length < 2) return solverCard;
        const suitCode = solverCard.slice(-1);
        const rankCode = solverCard.slice(0, -1);
        const rank = rankCode === "T" ? "10" : rankCode;
        const suitMap: Record<string, string> = {
            h: "♥",
            d: "♦",
            c: "♣",
            s: "♠",
        };
        return `${rank}${suitMap[suitCode] ?? suitCode}`;
    };

    const renderCardPattern = (card: Card) => {
        const symbol = getSuitSymbol(card.suit);
        const color = getSuitColorClass(card.suit);

        return (
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-6xl ${color}`}>{symbol}</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-2 overflow-hidden relative">
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_var(--tw-gradient-via)_40%,_black_100%)] ${activeTableSkin.backgroundGradientClass} opacity-100 z-0`} />

            <div className="relative z-10 w-full max-w-[1450px] h-[95vh] flex flex-col gap-2 pt-2">

                <header className="flex items-center justify-between h-12 px-6">
                    <div className="text-3xl font-black bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent tracking-tighter italic">
                        THE GUNG
                    </div>
                    <div className="w-32" />
                </header>

                <div className="flex-1 flex gap-4 overflow-hidden">

                    {/* Left Sidebar: Order Claimed */}
                    <aside className="w-[300px] shrink-0 bg-[#0a0a0a] rounded-xl border border-zinc-800/60 shadow-2xl flex flex-col overflow-hidden">
                        <div className="h-16 flex items-center justify-center border-b border-zinc-800/60 relative">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                                Order Claimed
                            </span>
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50"></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {[...players].sort((a, b) => a.id === playerId ? -1 : b.id === playerId ? 1 : 0).map(p => {
                                const isMe = p.id === playerId;
                                return (
                                    <div key={p.id} className="p-3 bg-zinc-900/20 rounded-xl border border-zinc-800/40 flex flex-col items-center gap-3">
                                        <div className={`text-[11px] font-bold ${isMe ? 'text-zinc-300' : 'text-zinc-500'} truncate w-full text-center flex items-center justify-center gap-1`}>
                                            <span
                                                    title={lobbyPlayers.find((player) => player.id === p.id)?.isConnected === false ? "Disconnected" : "Connected"}
                                                    className={`inline-block w-2.5 h-2.5 rounded-full ${lobbyPlayers.find((player) => player.id === p.id)?.isConnected === false ? "bg-red-500" : "bg-green-500"}`}
                                                />
                                            {p.name} {isMe && <span className="text-zinc-500">(You)</span>}
                                            {p.lockedIn && <span className="text-green-500 text-[10px]" title="Locked In">✓</span>}
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                            {chipColors.map((color) => {
                                                const chip = p.chips[color];
                                                const canStealChip =
                                                    p.id !== playerId &&
                                                    color === currentColor &&
                                                    chip !== null &&
                                                    phase !== "SHOWDOWN" &&
                                                    phase !== "FINISHED" &&
                                                    phase !== "INIT";

                                                const isTaken = chip !== null;

                                                let chipColorClass = 'bg-[#e5e5e5] text-black shadow-md';
                                                if (color === 'white') chipColorClass = 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.4)]';
                                                if (color === 'yellow') chipColorClass = 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]';
                                                if (color === 'orange') chipColorClass = 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]';
                                                if (color === 'red') chipColorClass = 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]';

                                                return (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => canStealChip && chip !== null && handleTakeChip(chip)}
                                                        disabled={!canStealChip}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-black transition-all ${isTaken ? chipColorClass : 'bg-[#141414] border border-zinc-800/80 text-zinc-700'} ${canStealChip ? "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white/80" : "cursor-default"}`}
                                                    >
                                                        {chip ?? "-"}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Center: The Heist */}
                    <main className="flex-1 bg-[#0a0a0a] rounded-xl border border-zinc-800/60 shadow-2xl flex flex-col overflow-hidden relative">
                        {/* Top Campaign Bar */}
                        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/60 relative">
                            {/* Left Stats */}
                            <div className="flex gap-4 items-center">
                                <div className="text-zinc-300 font-bold tracking-wide text-[14px]">
                                    Heist #{heistNumber}
                                </div>
                                <div className="text-yellow-500 font-bold tracking-wide text-[14px]">
                                    Vaults: {successes}/3
                                </div>
                                <div className="text-[#ef4444] font-bold tracking-wide text-[14px]">
                                    Alarms: {failures}/3
                                </div>
                            </div>

                            {/* Right Status */}
                            <div className="flex items-center gap-4">
                                <div className="px-5 py-1.5 bg-[#141414] border border-zinc-800 rounded-full flex items-center gap-2 shadow-inner">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">PHASE:</span>
                                    <span className="text-[10px] text-zinc-300 font-black uppercase tracking-widest">{phase}</span>
                                </div>
                                <div className="relative group">
                                    <button className="w-8 h-8 rounded-full bg-[#141414] flex items-center justify-center text-zinc-500 hover:text-white transition-colors border border-zinc-800 shadow-inner">?</button>
                                    <div className="absolute top-10 right-0 w-80 bg-[#111] border border-zinc-800 p-4 rounded-xl shadow-2xl hidden group-hover:block z-50">
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
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-30"></div>
                        </div>

                        {/* Center Layout Overlay (The Heist string) */}
                        <div className="flex-1 relative flex flex-col bg-[#0a0a0a]">
                            <div className={`absolute inset-0 ${activeTableSkin.auraClass} pointer-events-none opacity-40`} />

                            {/* "THE HEIST" TEXT */}
                            <div className="absolute top-12 left-0 right-0 text-center pointer-events-none">
                                <span className="text-xs font-black tracking-[0.3em] text-zinc-500 uppercase">
                                    The Heist
                                </span>
                            </div>

                            {/* Community Cards */}
                            <div className="flex-1 flex items-center justify-center gap-4 pt-6">
                                {communityCards.map((card, idx) => (
                                    <div key={idx} className={`w-24 h-36 rounded-xl transition-all duration-700 border border-zinc-800/80 ${card ? `${activeCardSkin.surfaceClass} shadow-[0_15px_30px_rgba(0,0,0,0.5)] bg-white` : 'bg-transparent border-zinc-700 border-dashed'}`}>
                                        {card ? (
                                            <div className={`p-2 h-full flex flex-col justify-between ${activeCardSkin.textClass} text-black font-black italic relative overflow-hidden`}>
                                                <div className={`text-lg leading-none ${getSuitColorClass(card.suit)}`}>
                                                    {card.rank}
                                                </div>
                                                {renderCardPattern(card)}
                                                <div className={`text-lg leading-none self-end rotate-180 ${getSuitColorClass(card.suit)}`}>
                                                    {card.rank}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Empty placeholder dots or similar to match the screenshot */
                                            <div className="w-full h-full rounded-xl bg-[#0d0d0d] flex items-center justify-center text-zinc-800/50">
                                                <div className="grid grid-cols-3 gap-2 opacity-30">
                                                    <span className="text-[8px]">●</span><span className="text-[8px]">●</span><span className="text-[8px]">●</span>
                                                    <span className="text-[8px]">●</span><span className="text-[8px]">●</span><span className="text-[8px]">●</span>
                                                    <span className="text-[8px]">●</span><span className="text-[8px]">●</span><span className="text-[8px]">●</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Divider line above bottom area */}
                            <div className="h-[1px] w-full bg-zinc-800/60 mt-auto"></div>

                            {/* Bottom Area (Available Bids, Hand Cards, Your Claim) */}
                            <div className="h-64 bg-[#111111] flex items-start justify-between relative">

                                {/* LEFT: Available Bids Grid */}
                                <div className="w-1/3 flex flex-col justify-start pl-4 pt-2 h-full">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                        Available Bids ({currentColor})
                                    </span>
                                    <div className="grid grid-cols-3 gap-y-3 gap-x-1 w-max">
                                        {Array.from({ length: totalPlayers }, (_, i) => i + 1).map(chipValue => {
                                            const owner = getChipOwner(chipValue);
                                            const isMine = owner?.id === playerId;
                                            const isTaken = owner !== undefined;
                                            return (
                                                <div key={chipValue} className="relative flex flex-col items-center gap-1.5">
                                                    <button
                                                        onClick={() => { if (!isMine) handleTakeChip(chipValue); }}
                                                        disabled={isMine}
                                                        className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-black transition-all text-xl
                                                        ${isMine ? `${currentChipColor} ring-4 ring-white/50 scale-105` :
                                                                isTaken ? 'bg-[#2a2a2a] text-zinc-600 border border-zinc-700 opacity-60' :
                                                                    `${currentChipColor} border border-transparent hover:-translate-y-1 hover:scale-105`
                                                            }
                                                        `}
                                                        title={owner ? (isMine ? 'Your chip' : `Steal from ${owner.name}`) : 'Take chip'}
                                                    >
                                                        <span>{chipValue}</span>
                                                    </button>
                                                    <span className={`text-[10px] uppercase font-black truncate text-center ${isTaken ? 'text-[#ef4444]' : 'text-zinc-400'}`}>
                                                        {isTaken ? 'TAKEN' : 'FREE'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* CENTER: Your Claim + Lock-in Button + Hand Cards Stack */}
                                <div className="w-1/3 flex flex-col items-center h-full relative pt-10">
                                    {/* Your Claim & Button Section */}
                                    <div className="flex flex-col items-center mb-6">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Your Claim</span>
                                        <div className="flex flex-row gap-6 items-center">
                                            <div className="flex gap-4 items-center justify-center">
                                                {myCurrentChip !== null ? (
                                                    <button
                                                        onClick={handleReturnChip}
                                                        className={`w-12 h-12 rounded-full border-2 border-transparent flex items-center justify-center font-black text-xl transition hover:scale-95 ${currentChipColor}`}
                                                        title="Click to return chip"
                                                    >
                                                        {myCurrentChip}
                                                    </button>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700/60 bg-[#161616] flex items-center justify-center text-zinc-700 font-bold text-[8px] shadow-inner uppercase tracking-widest">
                                                        EMPTY
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hand Cards */}
                                    <div className="flex justify-center gap-3 mt-4">
                                        {myCards.map((card, idx) => (
                                            <div key={idx} className={`w-[85px] h-[125px] ${activeCardSkin.surfaceClass} bg-white rounded-xl shadow-2xl transition-all hover:-translate-y-2 cursor-pointer relative overflow-hidden group border border-zinc-300`}>
                                                <div className={`p-2 h-full flex flex-col justify-between ${activeCardSkin.textClass} text-black font-black italic relative z-10 pointer-events-none`}>
                                                    <div className={`text-base leading-none ${getSuitColorClass(card.suit)}`}>
                                                        {card.rank}
                                                    </div>
                                                    {renderCardPattern(card)}
                                                    <div className={`text-base leading-none self-end rotate-180 ${getSuitColorClass(card.suit)}`}>
                                                        {card.rank}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* RIGHT: Bids einloggen Button */}
                                <div className="w-1/3 flex flex-col justify-start items-end pr-4 pt-6 h-full">
                                    <button
                                        onClick={() => {
                                            if (myCurrentChip !== null) {
                                                handleToggleLockIn();
                                            }
                                        }}
                                        disabled={myCurrentChip === null}
                                        className={`px-6 py-3 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300 border ${myCurrentChip === null
                                            ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                                            : myLockedIn
                                                ? 'bg-[#16a34a] border-[#15803d] text-white shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:bg-[#15803d]'
                                                : 'bg-[#e5e5e5] text-black border-zinc-400 hover:bg-white hover:scale-105 shadow-xl'
                                            }`}
                                        title={myCurrentChip === null ? "Requires chip" : "Toggle Lock-In"}
                                    >
                                        {myLockedIn ? 'Eingeloggt ✓' : 'Bids einloggen'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Right Sidebar: ChatBox */}
                    {/* Make ChatBox match the new dark aesthetics. We pass standard props, ChatBox handles its own container. */}
                    <aside className="w-[300px] shrink-0 bg-[#0a0a0a] rounded-xl border border-zinc-800/60 shadow-2xl flex flex-col overflow-hidden">
                        <ChatBox className="flex-1 rounded-none border-none shadow-none" joinCode={joinCode} />
                    </aside>

                </div>
            </div>

            {/* HEIST RESULT / SHOWDOWN OVERLAY */}
            {showShowdown && heistResult && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 gap-6 overflow-hidden">

                    {showImpactFlash && (
                        <div className={`absolute inset-0 pointer-events-none ${heistResult.success ? "reveal-flash-success" : "reveal-flash-alarm"}`} />
                    )}

                    <header className="flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-4xl font-black italic bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent tracking-tighter">
                                HEIST #{heistResult.heistNumber} — {revealPhase === "impact" ? (heistResult.success ? "VAULT CRACKED" : "ALARM TRIGGERED") : "ACCESSING LOCK MECHANISM..."}
                            </h2>
                            <p className="text-sm text-zinc-400 mt-1">
                                Vaults: {heistResult.successes}/3 · Alarms: {heistResult.failures}/3
                            </p>
                            {revealPhase === "impact"}
                        </div>
                        <button
                            onClick={() => setShowShowdown(false)}
                            disabled={revealPhase !== "impact"}
                            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {revealPhase === "impact" ? "Continue" : "Revealing..."}
                        </button>
                    </header>

                    <div className="flex-1 grid gap-3 items-stretch" style={{ gridTemplateColumns: `repeat(${heistResult.orderedShowdown.length}, 1fr)` }}>
                        {heistResult.orderedShowdown.map((p, idx) => {
                            const revealed = idx < revealedCount;
                            const isLast = idx === heistResult.orderedShowdown.length - 1;
                            return (
                                <div key={p.playerId} className="relative" style={{ perspective: '800px' }}>
                                    <div
                                        className="w-full h-full transition-transform duration-700 ease-out"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transform: revealed ? 'rotateY(0deg) translateY(0px)' : 'rotateY(90deg) translateY(18px)',
                                        }}
                                    >
                                        <div className={`w-full h-full rounded-2xl border flex flex-col p-4 gap-3 shadow-2xl ${isLast && revealed ? 'bg-yellow-950/60 border-yellow-500/60 shadow-yellow-500/20' : 'bg-zinc-900/70 border-zinc-800'}`}>
                                            <div className={`self-start px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isLast ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                                Rank {p.trueRank} · Chip {p.redChip}
                                            </div>

                                            <div className="font-black text-sm uppercase tracking-tight truncate text-white">
                                                {p.playerName}
                                            </div>

                                            <div className={`text-center text-xs font-black uppercase tracking-widest ${isLast ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                                {p.handName}
                                            </div>

                                            <div className="text-center text-[10px] text-zinc-500">
                                                {p.handDescription}
                                            </div>

                                            <div className="text-center text-[10px] text-zinc-400 font-mono tracking-wide">
                                                {p.bestHandCards.map((card) => formatShowdownCard(card)).join(" · ")}
                                            </div>

                                            {isLast && revealed && (
                                                <div className="text-center text-2xl animate-bounce">👑</div>
                                            )}
                                        </div>
                                    </div>

                                    {!revealed && (
                                        <div className={`absolute inset-0 rounded-2xl ${activeCardSkin.backClass} flex items-center justify-center ${revealPhase === "intro" ? "animate-pulse" : ""}`}>
                                            <span className="text-5xl opacity-20">🂠</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* GAME OVER OVERLAY */}
            {gameOver && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center">
                    <div className="text-center space-y-6">
                        <h2 className={`text-6xl font-black italic ${gameOver.won ? 'text-green-400' : 'text-red-500'}`}>
                            {gameOver.won ? "HEIST COMPLETE!" : "BUSTED!"}
                        </h2>
                        <p className="text-xl text-zinc-400">
                            Vaults: {gameOver.successes}/3 · Alarms: {gameOver.failures}/3
                        </p>
                        <button
                            onClick={onLeave}
                            className="px-8 py-3 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all"
                        >
                            Back to Lobby
                        </button>
                    </div>
                </div>
            )}

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
