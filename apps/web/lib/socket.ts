import { io, Socket } from "socket.io-client";

const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
const fallbackSocketUrl = `http://${host}:9000`;

export const socket: Socket = io(configuredSocketUrl || fallbackSocketUrl, {
    autoConnect: false,
});