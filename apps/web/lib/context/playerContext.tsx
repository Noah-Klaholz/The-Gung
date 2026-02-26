"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isHost?: boolean;
}

interface PlayerContextType {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerId: string;
  setPlayerId: (id: string) => void;
  lobbyId?: string;
  setLobbyId: (id: string) => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [lobbyId, setLobbyId] = useState<string | undefined>();
  const [players, setPlayers] = useState<Player[]>([]);

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