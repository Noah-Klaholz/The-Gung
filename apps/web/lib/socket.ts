import { io, Socket } from "socket.io-client";

const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
const fallbackSocketUrl = `http://${host}:9000`;
const socketUrl = process.env.NODE_ENV === "development"
    ? (configuredSocketUrl || fallbackSocketUrl)
    : configuredSocketUrl;

if (process.env.NODE_ENV !== "development" && !configuredSocketUrl && typeof window !== "undefined") {
    console.warn("NEXT_PUBLIC_SOCKET_URL is not set; Socket.IO will use the current origin.");
}

export const socket: Socket = io(socketUrl, {
    autoConnect: false,
});