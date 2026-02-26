"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isHost?: boolean;
  isConnected?: boolean;
}

interface PlayerContextType {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerId: string;
  setPlayerId: (id: string) => void;
  lobbyId?: string;
  setLobbyId: (id: string | undefined) => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const PLAYER_NAME_KEY = "playerName";
const PLAYER_ID_KEY = "the-gang-device-id";
const LOBBY_ID_KEY = "the-gung-lobby-id";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [lobbyId, setLobbyId] = useState<string | undefined>();
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const storedName = localStorage.getItem(PLAYER_NAME_KEY);
    if (storedName) {
      setPlayerName(storedName);
    }

    const storedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    }

    const storedLobbyId = localStorage.getItem(LOBBY_ID_KEY);
    if (storedLobbyId) {
      setLobbyId(storedLobbyId);
    }
  }, []);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem(PLAYER_NAME_KEY, playerName);
      return;
    }

    localStorage.removeItem(PLAYER_NAME_KEY);
  }, [playerName]);

  useEffect(() => {
    if (playerId) {
      localStorage.setItem(PLAYER_ID_KEY, playerId);
      return;
    }

    localStorage.removeItem(PLAYER_ID_KEY);
  }, [playerId]);

  useEffect(() => {
    if (lobbyId) {
      localStorage.setItem(LOBBY_ID_KEY, lobbyId);
      return;
    }

    localStorage.removeItem(LOBBY_ID_KEY);
  }, [lobbyId]);

  return (
    <PlayerContext.Provider value={{ playerName, setPlayerName, lobbyId, setLobbyId, playerId, setPlayerId, players, setPlayers }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
}