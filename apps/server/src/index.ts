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

httpServer.listen(SERVER_PORT, "0.0.0.0", () => {
  console.log(`Socket server running and accepting connections on port ${SERVER_PORT}`);
});