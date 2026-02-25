"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface PlayerContextType {
  playerName: string;
  setPlayerName: (name: string) => void;
  lobbyId?: string;
  setLobbyId: (id: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState("");
  const [lobbyId, setLobbyId] = useState<string | undefined>();

  return (
    <PlayerContext.Provider value={{ playerName, setPlayerName, lobbyId, setLobbyId }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
}