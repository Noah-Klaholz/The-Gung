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
  const { playerName, setPlayerName, playerId, setPlayerId, setPlayers, players } = usePlayer();

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

  useEffect(() => {
    // Load stored player name
    const storedName = localStorage.getItem("playerName");
    if (storedName) setName(storedName);

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
    if (!activeJoinCode) socket.emit("CREATE_LOBBY", { playerName, playerId });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinInput.trim();
    if (code) {
      socket.emit("JOIN_LOBBY", { joinCode: code, playerName, playerId });
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

  const handleLeaveLobby = () => {
    if (!activeJoinCode) return;
    socket.emit("LEAVE_LOBBY", { joinCode: activeJoinCode, playerId });
    setActiveJoinCode(null);
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
              placeholder="z.B. 123456"
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
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderWaitingRoomView = () => (
    <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-4 lg:items-start">
      <div className="w-full max-w-md mx-auto lg:mx-0 lg:flex-1 space-y-4">
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-2 shadow-lg">
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
            <span className="text-white font-mono tracking-wider font-semibold text-lg">{activeJoinCode}</span>
          </div>
        </div>

        <div className="w-full p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
          <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wider">Waiting Room</h1>
          <div className="space-y-3 mb-8">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">Players ({players.length}/{maxPlayers})</h2>
            <div className="flex flex-col gap-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-black border border-neutral-800 rounded-lg">
                  <span className="text-white font-medium">
                    {player.isHost && <span className="mr-2" title="Host">👑</span>}
                    {player.name}
                  </span>
                  <span className={`text-xs uppercase font-bold tracking-wider px-2 py-1 rounded ${player.isReady ? "text-green-500 bg-green-500/10 border border-green-500/20" : "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"}`}>
                    {player.isReady ? "Ready" : "Waiting"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {isCurrentUserHost && (
              <button
                disabled={!allPlayersReady}
                onClick={() => activeJoinCode && socket.emit("START_GAME", { joinCode: activeJoinCode })}
                className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Spiel Starten
              </button>
            )}
            <button
              onClick={handleToggleReady}
              className={`w-full py-4 px-4 font-bold rounded-lg transition-colors uppercase tracking-widest ${isCurrentUserReady ? "bg-green-600 hover:bg-green-500 text-white" : "bg-white hover:bg-neutral-200 text-black"}`}
            >
              {isCurrentUserReady ? "Not Ready" : "Ready"}
            </button>
            <button
              onClick={handleLeaveLobby}
              className="w-full py-2 px-4 bg-transparent text-neutral-500 hover:text-red-400 transition-colors uppercase tracking-wider text-xs font-medium border border-transparent hover:border-red-400/30 rounded"
            >
              Leave Lobby
            </button>

            <div className="rounded-lg border border-neutral-800 bg-black/60 p-4 space-y-3">
              <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Visuals</h3>
              <div>
                <label htmlFor="tableSkin" className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-1 font-bold">
                  Table Skin
                </label>
                <select
                  id="tableSkin"
                  value={tableSkin}
                  onChange={(event) => {
                    const nextSkin = event.target.value;
                    if (isTableSkin(nextSkin)) setTableSkin(nextSkin);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white"
                >
                  {(Object.keys(TABLE_SKINS) as TableSkin[]).map((skinKey) => (
                    <option key={skinKey} value={skinKey}>{TABLE_SKINS[skinKey].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cardSkin" className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-1 font-bold">
                  Card Skin
                </label>
                <select
                  id="cardSkin"
                  value={cardSkin}
                  onChange={(event) => {
                    const nextSkin = event.target.value;
                    if (isCardSkin(nextSkin)) setCardSkin(nextSkin);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white"
                >
                  {(Object.keys(CARD_SKINS) as CardSkin[]).map((skinKey) => (
                    <option key={skinKey} value={skinKey}>{CARD_SKINS[skinKey].label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-neutral-700 bg-neutral-900/80 p-3 space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Live Preview</div>
                <div className={`h-12 rounded-md border border-neutral-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_var(--tw-gradient-via)_45%,_black_100%)] ${activeTableSkin.backgroundGradientClass} relative overflow-hidden`}>
                  <div className={`absolute inset-0 ${activeTableSkin.auraClass}`} />
                  <div className="absolute top-1 right-2 text-[9px] font-bold text-neutral-300 tracking-widest">
                    {activeTableSkin.label}
                  </div>
                </div>
                <div className="flex items-center justify-between">
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
        </div>

        <button
          onClick={() => setIsLobbyChatOpen((prev) => !prev)}
          className="lg:hidden w-full py-2 px-4 bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold rounded-lg hover:text-white transition-colors uppercase tracking-widest text-xs"
        >
          {isLobbyChatOpen ? "Hide Chat" : "Show Chat"}
        </button>
      </div>

      <div className="w-full lg:w-80 lg:shrink-0">
        <div className={`${isLobbyChatOpen ? "block" : "hidden"} lg:block`}>
          <ChatBox className="w-full h-[36rem]" joinCode={activeJoinCode ?? undefined} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans relative p-4">
      {currentView === "LOGIN" && renderLoginView()}
      {currentView === "SELECTION" && renderSelectionView()}
      {currentView === "WAITING_ROOM" && renderWaitingRoomView()}
      {currentView === "GAME" && activeJoinCode && (
        <Game
          playerId={playerId}
          joinCode={activeJoinCode}
          onLeave={handleLeaveLobby}
          cardSkin={cardSkin}
          tableSkin={tableSkin}
        />
      )}
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
) {
  socket.off("LOBBY_UPDATE");
  socket.off("LOBBY_CREATED");
  socket.off("LOBBY_JOINED");
  socket.off("ERROR");
  socket.off("LOBBY_LEFT");
  socket.off("GAME_STARTED");

  socket.on("LOBBY_UPDATE", ({ players, maxPlayers }) => {
    if (maxPlayers) setMaxPlayers(maxPlayers);

    setPlayers(players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady || false,
      isHost: p.isHost || false,
    })));
  });

  socket.on("LOBBY_CREATED", ({ joinCode, playerId }) => {
    setActiveJoinCode(joinCode);
    setPlayerId(playerId);
    setCurrentView("WAITING_ROOM");
  });

  socket.on("LOBBY_JOINED", ({ joinCode, playerId }) => {
    setActiveJoinCode(joinCode);
    setPlayerId(playerId);
    setCurrentView("WAITING_ROOM");
  });

  socket.on("LOBBY_LEFT", () => {
    setActiveJoinCode("");
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