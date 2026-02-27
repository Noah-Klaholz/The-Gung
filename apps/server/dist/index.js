import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socket/socketHandler.js";
import { CORS_ORIGINS, SERVER_PORT } from "./config.js";
const httpServer = http.createServer();
const io = new Server(httpServer, {
    cors: {
        origin: CORS_ORIGINS,
    },
});
setupSocketHandlers(io);
httpServer.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${SERVER_PORT} is already in use. Stop the other server process or start with SERVER_PORT=<port>.`);
        process.exit(1);
    }
    console.error("Failed to start socket server:", error);
    process.exit(1);
});
httpServer.listen(SERVER_PORT, "0.0.0.0", () => {
    console.log(`Socket server running and accepting connections on port ${SERVER_PORT}`);
});
const shutdown = () => {
    io.close(() => {
        httpServer.close(() => process.exit(0));
    });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
