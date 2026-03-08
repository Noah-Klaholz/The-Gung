"use client";

import React, { useEffect, useState } from "react";
import { socket } from "../../lib/socket";
import { usePlayer } from "../../lib/context/playerContext";

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
}

interface IncomingChatMessage {
  id?: string;
  text?: string;
  sender?: string;
  message?: string;
}

interface ChatBoxProps {
  className?: string;
  title?: string;
  placeholder?: string;
  showStatusIndicator?: boolean;
  joinCode?: string;
}

export default function ChatBox({
  className,
  title = "Comms channel",
  placeholder = "Send Message",
  showStatusIndicator = true,
  joinCode,
}: ChatBoxProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { playerName, playerId, players, lobbyId } = usePlayer();

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = message.trim();
    const targetJoinCode = joinCode ?? lobbyId;
    if (!trimmed || !targetJoinCode) return;

    const myLobbyPlayer = players.find((player) => player.id === playerId);
    const storedName = localStorage.getItem("playerName")?.trim();
    const resolvedSenderName =
      playerName.trim() || myLobbyPlayer?.name?.trim() || storedName || "Unknown";

    socket.emit("CHAT_MESSAGE", {
      joinCode: targetJoinCode,
      message: trimmed,
      senderName: resolvedSenderName,
      playerId,
    });

    setMessage(""); // Empty input
  };

  useEffect(() => {
    const handleIncomingMessage = (data: IncomingChatMessage) => {
      const normalizedText = data.text ?? data.message;
      if (!normalizedText) return;

      setMessages((prev) => [
        ...prev,
        {
          id: data.id ?? `${Date.now()}-${Math.random()}`,
          text: normalizedText,
          sender: data.sender ?? "Unknown",
        },
      ]);
    };

    socket.on("CHAT_MESSAGE", handleIncomingMessage);

    return () => {
      socket.off("CHAT_MESSAGE", handleIncomingMessage);
    };
  }, []);
  return (
    <section
      className={`bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden ${className ?? ""}`}
    >
      <div className="h-14 md:h-16 bg-zinc-900 border-b border-zinc-800 flex items-center px-6">
        <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-zinc-400">
          {title}
        </span>
        {showStatusIndicator && (
          <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 flex flex-col">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-zinc-800 px-3 py-2 rounded-lg text-sm md:text-xs lg:text-sm text-white"
          >
            <div className="text-zinc-400 text-xs md:text-[10px] uppercase tracking-wider mb-1">
              {msg.sender}
            </div>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="p-3 md:p-4 bg-zinc-900/50 border-t border-zinc-800">
        <form
          className="relative flex items-center"
          onSubmit={handleChatSubmit}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm md:text-xs lg:text-sm focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 text-zinc-500 hover:text-white transition-colors"
          >
            ➔
          </button>
        </form>
      </div>
    </section>
  );
}
