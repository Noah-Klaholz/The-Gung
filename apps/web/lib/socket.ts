import { io, Socket } from "socket.io-client";

const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || undefined;
const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
const fallbackSocketUrl = `http://${host}:9000`;

// In development: use env var or fallback to local server at port 9000
// In production: MUST use env var; fall back to local server (will fail if not set)
const socketUrl = configuredSocketUrl
    || (process.env.NODE_ENV === "development" ? fallbackSocketUrl : undefined);

if (!socketUrl && typeof window !== "undefined") {
    console.error(
        "[socket] NEXT_PUBLIC_SOCKET_URL is not set. " +
        "The socket connection will target the page origin, which will fail " +
        "unless a Socket.IO server is running there. " +
        "Set NEXT_PUBLIC_SOCKET_URL in your environment or .env.local file."
    );
}

export const socket: Socket = io(socketUrl, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});