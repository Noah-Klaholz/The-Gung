"use client";

import { useState, useEffect } from "react";
import { socket } from "../lib/socket";
import { usePlayer, Player } from "../lib/context/playerContext";
import Game from "./components/Game";
import ChatBox from "./components/ChatBox";
import {
  CARD_SKINS,
  DEFAULT_CARD_SKIN,
  DEFAULT_TABLE_SKIN,
  isCardSkin,
  isTableSkin,
  TABLE_SKINS,
  type CardSkin,
  type TableSkin,
} from "../lib/skins";

export default function RootPage() {
  const { playerName, setPlayerName, playerId, setPlayerId, lobbyId, setLobbyId, setPlayers, players } = usePlayer();

  const [currentView, setCurrentView] = useState<
    "LOGIN" | "SELECTION" | "WAITING_ROOM" | "GAME"
  >("LOGIN");

  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [activeJoinCode, setActiveJoinCode] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState(""); // only for the join form input
  const [isLobbyChatOpen, setIsLobbyChatOpen] = useState(false);
  const [cardSkin, setCardSkin] = useState<CardSkin>(DEFAULT_CARD_SKIN);
  const [tableSkin, setTableSkin] = useState<TableSkin>(DEFAULT_TABLE_SKIN);
  const [advancedMode, setAdvancedMode] = useState(false);

  const resolvePlayerName = () => {
    const storedName = localStorage.getItem("playerName")?.trim();
    return playerName.trim() || name.trim() || storedName || "";
  };

  useEffect(() => {
    // Load stored player name
    const storedName = localStorage.getItem("playerName");
    if (storedName) {
      const normalizedName = storedName.trim().slice(0, 25);
      if (normalizedName) {
        setName(normalizedName);
        setPlayerName(normalizedName);
      }
    }

    const storedCardSkin = localStorage.getItem("the-gung-card-skin");
    if (storedCardSkin && isCardSkin(storedCardSkin)) {
      setCardSkin(storedCardSkin);
    }

    const storedTableSkin = localStorage.getItem("the-gung-table-skin");
    if (storedTableSkin && isTableSkin(storedTableSkin)) {
      setTableSkin(storedTableSkin);
    }

    // Persistent device ID
    let savedId = localStorage.getItem("the-gang-device-id");
    if (!savedId) {
      savedId = crypto.randomUUID();
      localStorage.setItem("the-gang-device-id", savedId);
    }
    setPlayerId(savedId);

    // Connect socket with device ID
    socket.auth = { deviceId: savedId };
    socket.connect();

    setupSocketHandlers(
      setPlayers,
      setActiveJoinCode,
      setCurrentView,
      setIsJoining,
      setErrorMsg,
      setMaxPlayers,
      setPlayerId,
      setLobbyId,
      setAdvancedMode,
    );

    return () => {
      socket.off("LOBBY_UPDATE");
      socket.off("LOBBY_CREATED");
      socket.off("LOBBY_JOINED");
      socket.off("ERROR");
      socket.off("LOBBY_LEFT");
      socket.off("GAME_STARTED");
    };
  }, []);

  useEffect(() => {
    if (!playerId) return;

    const me = players.find((player) => player.id === playerId);
    const normalizedName = me?.name?.trim().slice(0, 25);
    if (!normalizedName) return;

    if (normalizedName !== playerName) {
      setPlayerName(normalizedName);
    }

    if (normalizedName !== name) {
      setName(normalizedName);
    }
  }, [players, playerId, playerName, name, setPlayerName]);

  useEffect(() => {
    localStorage.setItem("the-gung-card-skin", cardSkin);
  }, [cardSkin]);

  useEffect(() => {
    localStorage.setItem("the-gung-table-skin", tableSkin);
  }, [tableSkin]);

  // --- Handlers ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim().slice(0, 25);
    if (trimmedName) {
      localStorage.setItem("playerName", trimmedName);
      setPlayerName(trimmedName);
      setCurrentView("SELECTION");
    }
  };

  const handleCreateLobby = () => {
    const resolvedName = resolvePlayerName();
    if (!resolvedName) return;

    if (resolvedName !== playerName) {
      setPlayerName(resolvedName);
    }

    if (activeJoinCode || lobbyId) {
      setActiveJoinCode(null);
      setLobbyId(undefined);
    }

    socket.emit("CREATE_LOBBY", { playerName: resolvedName, playerId });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinInput.trim();
    const resolvedName = resolvePlayerName();
    if (code && resolvedName) {
      if (resolvedName !== playerName) {
        setPlayerName(resolvedName);
      }

      socket.emit("JOIN_LOBBY", { joinCode: code, playerName: resolvedName, playerId });
      setJoinInput("");
    }
  };

  const handleCopyCode = async () => {
    if (!activeJoinCode) return;
    try {
      await navigator.clipboard.writeText(activeJoinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const handleToggleReady = () => {
    if (!activeJoinCode) return;
    socket.emit("TOGGLE_READY", { joinCode: activeJoinCode, playerId });
  };

  const handleToggleAdvancedMode = () => {
    if (!activeJoinCode || !isCurrentUserHost) return;
    socket.emit("TOGGLE_ADVANCED_MODE", { joinCode: activeJoinCode, playerId });
  };

  const handleLeaveLobby = () => {
    if (!activeJoinCode) return;
    socket.emit("LEAVE_LOBBY", { joinCode: activeJoinCode, playerId });
    setActiveJoinCode(null);
    setLobbyId(undefined);
    setIsJoining(false);
    setCurrentView("SELECTION");
  };

  // --- Derived state ---
  const currentPlayer = players.find((p) => p.id === playerId);
  const isCurrentUserReady = currentPlayer?.isReady ?? false;
  const isCurrentUserHost = currentPlayer?.isHost ?? false;
  const allPlayersReady = players.length > 0 && players.every((p) => p.isReady);
  const activeTableSkin = TABLE_SKINS[tableSkin];
  const activeCardSkin = CARD_SKINS[cardSkin];

  // --- Views ---
  const renderLoginView = () => (
    <div className="w-full max-w-sm p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
      <h1 className="text-4xl font-bold text-white text-center mb-8 uppercase tracking-wider">
        The Gung
      </h1>
      <form onSubmit={handleLoginSubmit} className="space-y-6">
        <div>
          <label htmlFor="nameInput" className="block text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
            Name
          </label>
          <input
            id="nameInput"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={25}
            className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600"
            placeholder="Your name..."
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
  );

  const renderSelectionView = () => (
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
            onClick={() => setCurrentView("LOGIN")}
            className="w-full py-2 px-4 mt-4 bg-transparent text-neutral-400 font-medium hover:text-white transition-colors uppercase tracking-wider text-xs underline underline-offset-4"
          >
            Back to Login
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
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors placeholder:text-neutral-600 font-mono tracking-wider"
              placeholder="e.g. 123456"
              required
              autoComplete="off"
            />
            {errorMsg && (
              <p className="text-red-500 text-xs mt-2 font-bold uppercase tracking-wider animate-pulse">{errorMsg}</p>
            )}
          </div>
          <div className="space-y-3">
            <button
              type="submit"
              disabled={!joinInput.trim()}
              className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm mt-2"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => setIsJoining(false)}
              className="w-full py-2 px-4 bg-transparent text-neutral-400 font-medium hover:text-white transition-colors uppercase tracking-wider text-xs underline underline-offset-4"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderWaitingRoomView = () => (
    <div className="w-full flex-1 flex flex-col items-center p-4 xl:p-8">
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 xl:gap-8 justify-center items-start">

        {/* LEFT COLUMN: Visual Settings */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 order-2 lg:order-1 flex flex-col">
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-800 bg-black/40">
              <span className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Visual Settings</span>
            </div>

            <div className="p-6 bg-neutral-900/50 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tableSkin" className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold px-1">
                    Table Skin
                  </label>
                  <select
                    id="tableSkin"
                    value={tableSkin}
                    onChange={(event) => {
                      const nextSkin = event.target.value;
                      if (isTableSkin(nextSkin)) setTableSkin(nextSkin);
                    }}
                    className="w-full bg-black/60 border border-neutral-700 hover:border-neutral-500 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors appearance-none cursor-pointer"
                  >
                    {(Object.keys(TABLE_SKINS) as TableSkin[]).map((skinKey) => (
                      <option key={skinKey} value={skinKey}>{TABLE_SKINS[skinKey].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cardSkin" className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold px-1">
                    Card Skin
                  </label>
                  <select
                    id="cardSkin"
                    value={cardSkin}
                    onChange={(event) => {
                      const nextSkin = event.target.value;
                      if (isCardSkin(nextSkin)) setCardSkin(nextSkin);
                    }}
                    className="w-full bg-black/60 border border-neutral-700 hover:border-neutral-500 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors appearance-none cursor-pointer"
                  >
                    {(Object.keys(CARD_SKINS) as CardSkin[]).map((skinKey) => (
                      <option key={skinKey} value={skinKey}>{CARD_SKINS[skinKey].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-700 bg-black/40 p-4 space-y-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold px-1">Live Preview</div>
                <div className={`h-16 rounded-lg border border-neutral-700/50 hover:border-neutral-600 transition-colors bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_var(--tw-gradient-via)_45%,_black_100%)] ${activeTableSkin.backgroundGradientClass} relative overflow-hidden shadow-inner flex items-center justify-center`}>
                  <div className={`absolute inset-0 ${activeTableSkin.auraClass}`} />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className={`z-10 w-12 h-16 rounded-md ${activeCardSkin.surfaceClass} shadow-2xl border border-black/20 p-1 flex flex-col justify-between ${activeCardSkin.textClass} transform -rotate-6 translate-x-2`}>
                    <div className={`${activeCardSkin.suitRedClass} text-[10px] font-black leading-none`}>
                      A<span className="block text-[8px]">♥</span>
                    </div>
                  </div>
                  <div className={`z-20 w-12 h-16 rounded-md ${activeCardSkin.surfaceClass} shadow-2xl border border-black/20 p-1 flex flex-col justify-between ${activeCardSkin.textClass} transform rotate-6 -translate-x-2 translate-y-2`}>
                    <div className={`${activeCardSkin.suitRedClass} text-[10px] font-black leading-none`}>
                      K<span className="block text-[8px]">♥</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 border-t border-neutral-800/50 pt-5">
                <div className={`w-14 h-20 rounded-md ${activeCardSkin.surfaceClass} shadow-lg border border-black/10 p-1.5 flex flex-col justify-between ${activeCardSkin.textClass}`}>
                  <div className={`${activeCardSkin.suitRedClass} text-xs font-black leading-none`}>
                    A
                    <span className="block text-[10px]">♥</span>
                  </div>
                  <div className={`self-end rotate-180 ${activeCardSkin.suitRedClass} text-xs font-black leading-none`}>
                    A
                    <span className="block text-[10px]">♥</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-white font-semibold">{activeCardSkin.label}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Card Skin</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Main Lobby Info */}
        <div className="w-full max-w-lg flex-1 order-1 lg:order-2 space-y-6">
          <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-2xl">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCopyCode}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors focus:outline-none"
                aria-label="Copy lobby code"
                title={copied ? "Copied!" : "Copy code"}
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Lobby Code</span>
                <span className="text-white font-mono tracking-widest font-black text-2xl">{activeJoinCode}</span>
              </div>
            </div>

            <div className="text-right px-4">
              <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold block">Players</span>
              <span className="text-white font-bold text-xl">{players.length}<span className="text-neutral-600">/{maxPlayers}</span></span>
            </div>
          </div>

          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800/50 flex justify-between items-center bg-black/40">
              <h1 className="text-xl font-bold text-white uppercase tracking-wider">Waiting Room</h1>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-black border border-neutral-800 rounded-lg">
                      <span className="text-white font-medium flex items-center gap-2">
                        <span
                          title={player.isConnected === false ? "Disconnected" : "Connected"}
                          className={`inline-block w-2.5 h-2.5 rounded-full ${player.isConnected === false ? "bg-red-500" : "bg-green-500"}`}
                        />
                        {player.isHost && <span className="mr-2" title="Host">👑</span>}
                        {player.name}
                      </span>
                      <span className={`text-xs uppercase font-bold tracking-wider px-2 py-1 rounded ${player.isReady ? "text-green-500 bg-green-500/10 border border-green-500/20" : "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"}`}>
                        {player.isConnected === false ? "Offline" : player.isReady ? "Ready" : "Waiting"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-black/20 border-t border-neutral-800/50 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {isCurrentUserHost && (
                    <button
                      disabled={!allPlayersReady}
                      onClick={() => activeJoinCode && socket.emit("START_GAME", { joinCode: activeJoinCode })}
                      className="w-full py-4 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                    >
                      Start Game
                    </button>
                  )}
                  <button
                    onClick={handleToggleReady}
                    className={`w-full py-4 px-4 font-bold rounded-xl transition-all uppercase tracking-widest text-sm ${isCurrentUserReady
                      ? "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,7,0.2)]"
                      : "bg-white hover:bg-neutral-200 text-black shadow-lg"
                      } ${isCurrentUserHost ? "col-span-2" : "col-span-2"}`}
                  >
                    {isCurrentUserReady ? "Not Ready" : "Ready"}
                  </button>
                </div>

                {/* Advanced Mode Toggle */}
                <div className="rounded-xl border border-neutral-800 bg-black/40 p-5 pl-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Advanced Mode</h3>
                    <p className="text-[10px] text-neutral-500 mt-1">Specialists & Challenges active</p>
                  </div>
                  <button
                    disabled={!isCurrentUserHost}
                    onClick={handleToggleAdvancedMode}
                    className={`w-14 h-7 rounded-full transition-colors relative flex items-center ${advancedMode ? "bg-orange-500" : "bg-neutral-700"
                      } ${!isCurrentUserHost ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform absolute ${advancedMode ? "translate-x-8" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>

                <button
                  onClick={handleLeaveLobby}
                  className="w-full py-2 px-4 bg-transparent text-neutral-500 hover:text-red-400 transition-colors uppercase tracking-wider text-xs font-medium border border-transparent hover:border-red-400/30 rounded"
                >
                  Leave Lobby
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Desktop Chat */}
        <div className="hidden lg:flex w-80 xl:w-96 flex-shrink-0 flex-col order-3 self-stretch">
          <div className="w-full h-full min-h-[500px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-neutral-800 bg-black/40">
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Lobby Chat</h2>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-black relative">
              <ChatBox className="absolute inset-0" joinCode={activeJoinCode ?? undefined} />
            </div>
          </div>
        </div>

      </div>

      {/* Floating Chat Button for Mobile */}
      <button
        onClick={() => setIsLobbyChatOpen((prev) => !prev)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-neutral-800 border fill-white border-neutral-700 text-white rounded-full shadow-2xl hover:bg-neutral-700 hover:scale-105 transition-all text-sm font-bold flex items-center justify-center group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Mobile Chat Box Panel */}
      <div
        className={`lg:hidden fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-black border-l border-neutral-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${isLobbyChatOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-full pt-20 pb-0 px-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Lobby Chat</h2>
            <button
              onClick={() => setIsLobbyChatOpen(false)}
              className="text-neutral-500 hover:text-white p-2 text-xs"
            >
              CLOSE
            </button>
          </div>
          <ChatBox className="flex-1 h-full rounded-t-xl" joinCode={activeJoinCode ?? undefined} />
        </div>
      </div>

      {/* Click outside backdrop for chat panel mobile */}
      {isLobbyChatOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsLobbyChatOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );

  if (currentView === "GAME" && activeJoinCode) {
    return (
      <Game
        playerId={playerId}
        joinCode={activeJoinCode}
        onLeave={handleLeaveLobby}
        cardSkin={cardSkin}
        tableSkin={tableSkin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans relative p-4">
      {currentView === "LOGIN" && renderLoginView()}
      {currentView === "SELECTION" && renderSelectionView()}
      {currentView === "WAITING_ROOM" && renderWaitingRoomView()}
    </div>
  );
}

// ------------------- SOCKET HANDLERS -------------------
export function setupSocketHandlers(
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
  setActiveJoinCode: (id: string) => void,
  setCurrentView: (view: "LOGIN" | "SELECTION" | "WAITING_ROOM" | "GAME") => void,
  setIsJoining: (joining: boolean) => void,
  setErrorMsg: (msg: string | null) => void,
  setMaxPlayers: (limit: number) => void,
  setPlayerId: (id: string) => void,
  setLobbyId: (id: string | undefined) => void,
  setAdvancedMode: (advanced: boolean) => void,
) {
  socket.off("LOBBY_UPDATE");
  socket.off("LOBBY_CREATED");
  socket.off("LOBBY_JOINED");
  socket.off("ERROR");
  socket.off("LOBBY_LEFT");
  socket.off("GAME_STARTED");

  socket.on("LOBBY_UPDATE", ({ players, maxPlayers, status, advancedMode }) => {
    if (maxPlayers) setMaxPlayers(maxPlayers);
    if (advancedMode !== undefined) setAdvancedMode(advancedMode);

    setPlayers(players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady || false,
      isHost: p.isHost || false,
      isConnected: p.isConnected !== false,
    })));

    if (status === "playing") {
      setCurrentView("GAME");
    }
  });

  socket.on("LOBBY_CREATED", ({ joinCode, playerId, status }) => {
    setActiveJoinCode(joinCode);
    setLobbyId(joinCode);
    setPlayerId(playerId);
    setCurrentView(status === "playing" ? "GAME" : "WAITING_ROOM");
  });

  socket.on("LOBBY_JOINED", ({ joinCode, playerId, status }) => {
    setActiveJoinCode(joinCode);
    setLobbyId(joinCode);
    setPlayerId(playerId);
    setCurrentView(status === "playing" ? "GAME" : "WAITING_ROOM");
  });

  socket.on("LOBBY_LEFT", () => {
    setActiveJoinCode("");
    setLobbyId(undefined);
    setCurrentView("SELECTION");
  });

  socket.on("ERROR", ({ message }) => {
    console.error("Socket error:", message);
    setErrorMsg(message);
    setTimeout(() => setErrorMsg(null), 3000);
  });

  socket.on("GAME_STARTED", () => {
    console.log("Received Game Started");
    setCurrentView("GAME");
  });
}