import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socket/socketHandler.ts";
import { SERVER_PORT } from "./config.ts";

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

setupSocketHandlers(io);

httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${SERVER_PORT} is already in use. Stop the other server process or start with SERVER_PORT=<port>.`,
    );
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