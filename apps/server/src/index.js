import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PORT } from './config.js';
import { setupWebSocket } from './ws/websocket.js';
import appRouter from './app.js';

const app = express();

app.use(cors({
  origin: '*' //TODO: Limit to Frontend-URL when available
}));

app.use(express.json());

// Express routes
app.use('/api', appRouter);

// HTTP Server (für Express + WS)
const server = createServer(app);

// WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});