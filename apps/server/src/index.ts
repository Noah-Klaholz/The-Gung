import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socket/socketHandler.ts";
import { PORT } from "./config.ts";

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});