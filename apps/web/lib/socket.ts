import { io, Socket } from "socket.io-client";

// Use the current browser hostname if available, so that LAN devices connect to the host's IP instead of their own 'localhost'
const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
export const socket: Socket = io(`http://${host}:9000`, {
    autoConnect: false,
});