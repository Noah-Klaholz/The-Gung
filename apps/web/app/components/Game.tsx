"use client";

import React, { useState, useEffect, useRef } from "react";
import ChatBox from "./ChatBox";
import { socket } from "../../lib/socket";
import { CARD_SKINS, TABLE_SKINS, type CardSkin, type TableSkin } from "../../lib/skins";
import { usePlayer } from "../../lib/context/playerContext";
import { AudioManager } from "../../lib/Audio/AudioManager"

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
    onOpenSettings: () => void;
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

export default function Game({ playerId, joinCode, onLeave, onOpenSettings, cardSkin, tableSkin }: GameProps) {
    const { players: lobbyPlayers } = usePlayer();

    // Server-driven state
    const [phase, setPhase] = useState("PRE-FLOP");
    const [communityCards, setCommunityCards] = useState<(Card | null)[]>([null, null, null, null, null]);
    const [myCards, setMyCards] = useState<Card[]>([]);
    const [players, setPlayers] = useState<GamePlayerState[]>([]);
    const [roundChips, setRoundChips] = useState<number[]>([]);
    const [selectedChip, setSelectedChip] = useState<number | null>(null);
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
    const [isHandRanksOpen, setIsHandRanksOpen] = useState(false);
    const [isGameChatOpen, setIsGameChatOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [gameError, setGameError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const handRankPopoverRef = useRef<HTMLDivElement | null>(null);
    const prevPhaseRef = useRef("PRE-FLOP");

    // Game over state
    const [gameOver, setGameOver] = useState<{ won: boolean; successes: number; failures: number } | null>(null);


    // Game music
    useEffect(() => {
        const audio = AudioManager.getInstance();   
        audio.play("/audio/music/gameMusic.mp3");

        return () => {
            audio.stopSound("/audio/music/gameMusic.mp3");
        };

    }, []);

    // Socket listeners
    useEffect(() => {
        const handleGameUpdate = (data: any) => {
            const pub = data.publicState;
            const priv = data.privateState;

            if (pub) {
                const newPhase = (pub.phase ?? "pre-flop").toUpperCase();
                if (newPhase !== prevPhaseRef.current) {
                    setSelectedChip(null);
                }
                prevPhaseRef.current = newPhase;
                setPhase(newPhase);
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

    // Track connection state & re-request game state on reconnection
    useEffect(() => {
        const onConnect = () => {
            setIsConnected(true);
            socket.emit("REQUEST_GAME_STATE", { joinCode });
        };
        const onDisconnect = () => setIsConnected(false);
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        setIsConnected(socket.connected);
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        };
    }, [joinCode]);

    // Show game errors (chip action failures etc.)
    useEffect(() => {
        const handleError = ({ message }: { message: string }) => {
            setGameError(message);
            setTimeout(() => setGameError(null), 4000);
        };
        socket.on("ERROR", handleError);
        return () => { socket.off("ERROR", handleError); };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!handRankPopoverRef.current) return;
            if (!handRankPopoverRef.current.contains(event.target as Node)) {
                setIsHandRanksOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sequential reveal animation for showdown
    useEffect(() => {
        if (!showShowdown || !heistResult) {
            setRevealedCount(0);
            setRevealPhase("idle");
            setResultBurst(null);
            setShowImpactFlash(false);
            return;
        }

        const audio = AudioManager.getInstance();
        audio.setPausedByUrl("/audio/music/gameMusic.mp3", true);
        audio.play("/audio/sfx/reveal.mp3");

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

                    audio.setPausedByUrl("/audio/music/gameMusic.mp3", false);

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

    // Chip actions
    const handleChipSelect = (star: number) => {
        setSelectedChip(star);
    };

    const handleConfirmChip = () => {
        if (selectedChip === null) return;
        if (!socket.connected) {
            setGameError("Not connected to server — reconnecting…");
            return;
        }
        socket.emit("CHIP_ACTION", {
            joinCode,
            playerId,
            action: { type: "take_center", star: selectedChip },
        });
        setSelectedChip(null);
    };

    const handleReturnChip = () => {
        if (!socket.connected) {
            setGameError("Not connected to server — reconnecting…");
            return;
        }
        socket.emit("CHIP_ACTION", {
            joinCode,
            playerId,
            action: { type: "return_own" },
        });
    };

    const handleTakePlayerChip = (fromPlayerId: string) => {
        if (!socket.connected) {
            setGameError("Not connected to server — reconnecting…");
            return;
        }
        socket.emit("CHIP_ACTION", {
            joinCode,
            playerId,
            action: { type: "take_player", fromPlayerId },
        });
        setSelectedChip(null);
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
        <div className="app-shell min-h-[100dvh] bg-black text-white flex items-stretch justify-center overflow-hidden relative">
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_var(--tw-gradient-via)_40%,_black_100%)] ${activeTableSkin.backgroundGradientClass} opacity-100 z-0`} />

            <div className="relative z-10 w-full max-w-[1680px] h-[min(96dvh,1050px)] flex flex-col gap-3 md:gap-4">

                <header className="flex items-center justify-between h-14 md:h-20 px-3 md:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen((prev) => !prev)}
                            className="lg:hidden px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-200"
                        >
                            Players
                        </button>
                        <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent tracking-tighter italic">
                            THE GUNG
                        </div>
                        <span
                            title={isConnected ? "Connected" : "Disconnected"}
                            className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"}`}
                        />
                    </div>
                    <button
                        onClick={() => setIsGameChatOpen((prev) => !prev)}
                        className="2xl:hidden px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-200"
                    >
                        {isGameChatOpen ? "Hide Chat" : "Show Chat"}
                    </button>
                </header>

                <div className="flex-1 flex flex-col 2xl:flex-row gap-3 md:gap-4 overflow-hidden min-h-0">

                    <main className="flex-1 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden min-h-0">

                        {/* Top Campaign Bar */}
                        <div className="bg-zinc-900 flex flex-wrap items-center justify-between px-4 md:px-8 py-3 gap-3 border-b border-zinc-800">
                            <div className="flex flex-wrap gap-x-4 gap-y-2 md:gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest">Heist:</span>
                                    <span className="text-yellow-500 font-black">{heistNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest">Vaults:</span>
                                    <span className="text-green-500 font-black drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">{successes}/3</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest">Alarms:</span>
                                    <span className="text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">{failures}/3</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={onOpenSettings}
                                    className="px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs md:text-sm font-bold uppercase tracking-wider text-zinc-200 hover:text-white"
                                    aria-label="Open settings"
                                >
                                    Settings
                                </button>
                                <div className="px-4 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs md:text-sm font-black tracking-[0.2em]">
                                    PHASE: <span className="text-yellow-500">{phase}</span>
                                </div>
                                <div className="relative" ref={handRankPopoverRef}>
                                    <button
                                        onClick={() => setIsHandRanksOpen((prev) => !prev)}
                                        aria-expanded={isHandRanksOpen}
                                        className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                                    >
                                        ?
                                    </button>
                                    {isHandRanksOpen && (
                                        <div className="absolute top-12 right-0 w-[22rem] max-w-[85vw] bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl z-50">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest">Hand Rankings</h4>
                                        <div className="grid text-xs gap-y-1.5" style={{ gridTemplateColumns: '1fr auto auto' }}>
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
                                                    <span className="text-zinc-600 font-mono mx-2 md:mx-3">{h.ex}</span>
                                                    <span className={`font-bold text-right ${h.gold ? "text-yellow-500" : h.dim ? "text-zinc-600" : "text-yellow-500"}`}>{h.rank}</span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden min-h-0">

                            {/* Left Sidebar: Chip History — hidden on small/tablet, visible on lg+ */}
                            <aside className="hidden lg:flex w-72 bg-zinc-950 border-r border-zinc-900 flex-col shrink-0">
                                <div className="p-4 border-b border-zinc-900 text-xs font-bold uppercase tracking-widest text-zinc-500">
                                    Player Logistics
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {players.map(p => (
                                        <div key={p.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                            <div className="text-sm font-bold truncate mb-3 flex items-center gap-2">
                                                <span
                                                    title={lobbyPlayers.find((player) => player.id === p.id)?.isConnected === false ? "Disconnected" : "Connected"}
                                                    className={`inline-block w-2.5 h-2.5 rounded-full ${lobbyPlayers.find((player) => player.id === p.id)?.isConnected === false ? "bg-red-500" : "bg-green-500"}`}
                                                />
                                                {p.name}
                                            </div>
                                            <div className="flex gap-2">
                                                {chipColors.map((color) => {
                                                    const chip = p.chips[color];
                                                    const canStealChip =
                                                        p.id !== playerId &&
                                                        color === currentColor &&
                                                        chip !== null &&
                                                        phase !== "SHOWDOWN" &&
                                                        phase !== "FINISHED" &&
                                                        phase !== "INIT";
                                                    const colorStyles: Record<string, string> = {
                                                        white: "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]",
                                                        yellow: "bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]",
                                                        orange: "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]",
                                                        red: "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]",
                                                    };
                                                    const style = chip !== null ? colorStyles[color] : "bg-transparent border-dashed";
                                                    return (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => canStealChip && handleTakePlayerChip(p.id)}
                                                            disabled={!canStealChip}
                                                            className={`w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${style} ${canStealChip ? "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-yellow-400/60" : "cursor-default"}`}
                                                        >
                                                            {chip ?? ""}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </aside>

                            {/* Center: The Heist */}
                            <div className="flex-1 relative flex flex-col">

                                <div className={`absolute inset-0 ${activeTableSkin.auraClass} pointer-events-none`} />

                                {/* Community Cards */}
                                <div className="flex-1 flex items-center justify-center gap-2 md:gap-3 px-3 py-3 md:py-4">
                                    {communityCards.map((card, idx) => (
                                        <div key={idx} className={`w-[4.5rem] h-[6.5rem] sm:w-[5.5rem] sm:h-[8rem] md:w-[7rem] md:h-[10rem] lg:w-28 lg:h-40 rounded-xl transition-all duration-700 shrink-0 ${card ? `${activeCardSkin.surfaceClass} shadow-[0_15px_30px_rgba(0,0,0,0.5)]` : activeCardSkin.placeholderClass}`}>
                                            {card && (
                                                <div className={`p-1.5 md:p-2 h-full flex flex-col justify-between ${activeCardSkin.textClass} font-black italic relative overflow-hidden`}>
                                                    <div className={`text-base md:text-xl leading-none ${getSuitColorClass(card.suit)}`}>
                                                        {card.rank}<br />
                                                        <span className="text-sm md:text-base">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                    {renderCardPattern(card)}
                                                    <div className={`text-base md:text-xl leading-none self-end rotate-180 ${getSuitColorClass(card.suit)}`}>
                                                        {card.rank}<br />
                                                        <span className="text-sm md:text-base">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Middle Action Bar */}
                                <div className="bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex items-center justify-between px-3 md:px-8 py-3 md:py-4 relative min-h-[6rem]">

                                    {/* Return chip button (left) */}
                                    {myCurrentChip !== null && (
                                        <button
                                            onClick={handleReturnChip}
                                            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 font-bold text-xs md:text-sm uppercase tracking-widest rounded-lg transition-all text-zinc-400 hover:text-white"
                                        >
                                            Return ✕
                                        </button>
                                    )}
                                    {myCurrentChip === null && <div />}

                                    {/* Active Selection Display (center) */}
                                    <div className="absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-dashed border-zinc-700 flex items-center justify-center">
                                        {(selectedChip ?? myCurrentChip) !== null ? (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg md:text-xl font-black shadow-[0_0_20px_rgba(220,38,38,0.5)] ${currentChipColor}`}>
                                                {selectedChip ?? myCurrentChip}
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600 text-sm font-bold">
                                                ?
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Chip Button (right) */}
                                    <div className="flex flex-col items-end gap-1">
                                        <button
                                            onClick={handleConfirmChip}
                                            disabled={selectedChip === null}
                                            className="px-5 py-2.5 bg-green-700 hover:bg-green-600 font-black text-xs md:text-sm uppercase tracking-widest rounded-lg transition-all shadow-[0_0_12px_rgba(22,163,74,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Confirm ▶
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Player Area */}
                                <div className="bg-zinc-950 border-t border-zinc-900 p-4 md:p-6 space-y-4">

                                    {/* Chip Pool */}
                                    <div>
                                        <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2">Available Chips</div>
                                        <div className="flex gap-3 flex-wrap">
                                            {roundChips.map((chip) => (
                                                <button
                                                    key={chip}
                                                    onClick={() => handleChipSelect(chip)}
                                                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center text-base font-black transition-all hover:scale-110 active:scale-90 ${selectedChip === chip
                                                        ? "border-yellow-400 ring-2 ring-yellow-400/50 " + currentChipColor
                                                        : "border-transparent " + currentChipColor
                                                        }`}
                                                >
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hand Cards */}
                                    <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
                                        {myCards.map((card, idx) => (
                                            <div key={idx} className={`w-[5rem] h-[7.5rem] sm:w-[5.5rem] sm:h-[8.5rem] md:w-[6.5rem] md:h-[9.5rem] lg:w-24 lg:h-36 ${activeCardSkin.surfaceClass} rounded-lg shadow-2xl transition-all hover:-translate-y-5 cursor-pointer relative overflow-hidden group active:scale-95`}>
                                                <div className={`p-1.5 md:p-2 h-full flex flex-col justify-between ${activeCardSkin.textClass} font-black italic`}>
                                                    <div className={`text-sm md:text-base leading-none ${getSuitColorClass(card.suit)}`}>
                                                        {card.rank}<br />
                                                        <span className="text-[11px] md:text-xs">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                    {renderCardPattern(card)}
                                                    <div className={`text-sm md:text-base leading-none self-end rotate-180 ${getSuitColorClass(card.suit)}`}>
                                                        {card.rank}<br />
                                                        <span className="text-[11px] md:text-xs">{getSuitSymbol(card.suit)}</span>
                                                    </div>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Chat sidebar — only on 2xl+ */}
                    <div className="hidden 2xl:block w-80 shrink-0 min-h-0">
                        <ChatBox className="w-full h-full" joinCode={joinCode} />
                    </div>

                </div>
            </div>

            {/* Chat overlay for < 2xl screens — always mounted to preserve messages */}
            <div className={`fixed inset-0 z-[100] 2xl:hidden transition-opacity duration-200 ${isGameChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <button
                    type="button"
                    aria-label="Close chat"
                    onClick={() => setIsGameChatOpen(false)}
                    className="absolute inset-0 bg-black/70"
                />
                <aside className={`absolute right-0 top-0 h-full w-[min(92vw,26rem)] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col transition-transform duration-200 ${isGameChatOpen ? "translate-x-0" : "translate-x-full"}`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Comms Channel</span>
                        <button
                            type="button"
                            onClick={() => setIsGameChatOpen(false)}
                            className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider"
                        >
                            Close
                        </button>
                    </div>
                    <ChatBox className="flex-1 border-0 rounded-none" joinCode={joinCode} />
                </aside>
            </div>

            {/* Sidebar overlay for < lg screens */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[90] lg:hidden">
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute inset-0 bg-black/70"
                    />
                    <aside className="absolute left-0 top-0 h-full w-[min(85vw,20rem)] bg-zinc-950 border-r border-zinc-800 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Player Logistics</span>
                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                                className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {players.map(p => (
                                <div key={p.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    <div className="text-sm font-bold truncate mb-3 flex items-center gap-2">
                                        <span
                                            title={lobbyPlayers.find((player) => player.id === p.id)?.isConnected === false ? "Disconnected" : "Connected"}
                                            className={`inline-block w-2.5 h-2.5 rounded-full ${lobbyPlayers.find((player) => player.id === p.id)?.isConnected === false ? "bg-red-500" : "bg-green-500"}`}
                                        />
                                        {p.name}
                                    </div>
                                    <div className="flex gap-2">
                                        {chipColors.map((color) => {
                                            const chip = p.chips[color];
                                            const colorStyles: Record<string, string> = {
                                                white: "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]",
                                                yellow: "bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]",
                                                orange: "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]",
                                                red: "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]",
                                            };
                                            const style = chip !== null ? colorStyles[color] : "bg-transparent border-dashed";
                                            return (
                                                <div
                                                    key={color}
                                                    className={`w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-xs font-bold ${style}`}
                                                >
                                                    {chip ?? ""}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            )}

            {/* Game error toast */}
            {gameError && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 bg-red-900/90 border border-red-700 rounded-xl text-sm font-bold text-red-200 shadow-2xl animate-pulse">
                    {gameError}
                </div>
            )}

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
                            {revealPhase === "impact" }
                        </div>
                        <button
                            onClick={() => setShowShowdown(false)}
                            disabled={revealPhase !== "impact"}
                            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {revealPhase === "impact" ? "Continue" : "Revealing..."}
                        </button>
                    </header>

                    <div className="flex-1 flex gap-3 overflow-x-auto items-stretch">
                        {heistResult.orderedShowdown.map((p, idx) => {
                            const revealed = idx < revealedCount;
                            const isLast = idx === heistResult.orderedShowdown.length - 1;
                            return (
                                <div key={p.playerId} className="relative min-w-[220px] md:min-w-[240px] flex-1" style={{ perspective: '800px' }}>
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
                className="fixed bottom-4 right-4 z-40 px-4 py-2 bg-zinc-800 text-xs font-bold text-zinc-400 rounded uppercase tracking-widest hover:text-red-500 transition-colors"
            >
                Leave Game
            </button>
        </div>
    );
}
