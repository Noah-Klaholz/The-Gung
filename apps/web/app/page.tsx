"use client";

import { useState, useEffect } from "react";
import { socket } from "../lib/socket";
import { usePlayer, Player } from "../lib/context/playerContext";

export default function RootPage() {
  const { playerName, setPlayerName, playerId, setPlayerId, setPlayers, players } = usePlayer();

  const [currentView, setCurrentView] = useState<
    "LOGIN" | "SELECTION" | "WAITING_ROOM"
  >("LOGIN");

  const [name, setName] = useState("");

  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [activeJoinCode, setActiveJoinCode] = useState<string | null>(null);

  // Default limit is 6, will be updated via backend LOBBY_UPDATE event
  const [maxPlayers, setMaxPlayers] = useState(6);

  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("playerName");
    if (storedName) {
      setName(storedName);
    }
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
    };
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim().slice(0, 25);
    if (trimmedName) {
      console.log("Joined as:", trimmedName);
      localStorage.setItem("playerName", trimmedName);
      setPlayerName(trimmedName);
      setCurrentView("SELECTION");
    }
  };

  const handleCreateLobby = () => {
    console.log("Create Lobby clicked");
    socket.emit("CREATE_LOBBY", { playerName });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedJoinCode = joinCode.trim();
    if (trimmedJoinCode) {
      console.log("Joining Lobby:", trimmedJoinCode);
      socket.emit("JOIN_LOBBY", { joinCode: trimmedJoinCode, playerName });
      setCurrentView("WAITING_ROOM");
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
    socket.emit("TOGGLE_READY", { joinCode, playerId })
  };

  const handleLeaveLobby = () => {
    setActiveJoinCode(null);
    setJoinCode("");
    setIsJoining(false);
    setCurrentView("SELECTION");
  };

  // The current user is identified by comparing player.id to socket.id
  const currentPlayer = players.find((p) => p.id === socket.id);
  const isCurrentUserReady = currentPlayer?.isReady ?? false;
  const isCurrentUserHost = currentPlayer?.isHost ?? false;
  const allPlayersReady = players.length > 0 && players.every((p) => p.isReady);

  const renderLoginView = () => (
    <div className="w-full max-w-sm p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
      <h1 className="text-4xl font-bold text-white text-center mb-8 uppercase tracking-wider">
        The Gung
      </h1>
      <form onSubmit={handleLoginSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="nameInput"
            className="block text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2"
          >
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
            <label
              htmlFor="joinCode"
              className="block text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2"
            >
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
            {errorMsg && (
              <p className="text-red-500 text-xs mt-2 font-bold uppercase tracking-wider animate-pulse">
                {errorMsg}
              </p>
            )}
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
  );

  const renderWaitingRoomView = () => (
    <div className="flex flex-col items-center w-full relative">
      <div className="absolute -top-16 right-0 md:top-6 md:right-6 flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-2 shadow-lg z-10">
        <button
          onClick={handleCopyCode}
          className="mr-3 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded transition-colors focus:outline-none"
          aria-label="Copy lobby code"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
            Lobby Code
          </span>
          <span className="text-white font-mono tracking-wider font-semibold text-lg">
            {activeJoinCode}
          </span>
        </div>
      </div>

      <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-xl mt-16 md:mt-0">
        <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wider">
          Waiting Room
        </h1>
        <div className="space-y-3 mb-8">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">
            Players ({players.length}/{maxPlayers})
          </h2>
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-black border border-neutral-800 rounded-lg"
              >
                <span className="text-white font-medium">
                  {player.isHost && (
                    <span className="mr-2" title="Host">
                      👑
                    </span>
                  )}
                  {player.name}
                </span>
                <span
                  className={`text-xs uppercase font-bold tracking-wider px-2 py-1 rounded ${player.isReady
                      ? "text-green-500 bg-green-500/10 border border-green-500/20"
                      : "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"
                    }`}
                >
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
              onClick={() => {
                socket.emit("START_GAME", joinCode)
                console.log("Start Game clicked")
              }
              }
              className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Spiel Starten
            </button>
          )}
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
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans relative p-4">
      {currentView === "LOGIN" && renderLoginView()}
      {currentView === "SELECTION" && renderSelectionView()}
      {currentView === "WAITING_ROOM" && renderWaitingRoomView()}
    </div>
  );
}

export function setupSocketHandlers(
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
  setActiveJoinCode: (id: string) => void,
  setCurrentView: (view: "LOGIN" | "SELECTION" | "WAITING_ROOM") => void,
  setIsJoining: (joining: boolean) => void,
  setErrorMsg: (msg: string | null) => void,
  setMaxPlayers: (limit: number) => void,
  setPlayerId: (id: string) => void,
) {
  // Prevent duplicate listeners
  socket.off("LOBBY_UPDATE");
  socket.off("LOBBY_CREATED");
  socket.off("LOBBY_JOINED");
  socket.off("ERROR");

  socket.on("LOBBY_UPDATE", ({ players, maxPlayers }) => {
    console.log("Lobby update received:", players);

    if (maxPlayers) {
      setMaxPlayers(maxPlayers);
    }

    setPlayers(
      players.map(
        (p: {
          id: string;
          name: string;
          isHost?: boolean;
          isReady?: boolean;
        }) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady || false, // until backend fully supports ready-state
          isHost: p.isHost || false, // wait for backend to support this properly
        }),
      ),
    );
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

  socket.on("ERROR", ({ message }) => {
    console.error("Socket error:", message);
    setErrorMsg("Lobby nicht gefunden");
    setCurrentView("SELECTION");
    setIsJoining(true);
    setTimeout(() => {
      setErrorMsg(null);
    }, 3000);
  });
}
