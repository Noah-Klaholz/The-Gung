import { v4 as uuidv4 } from 'uuid';

const lobbiesWS = {}; // lobbyId → Set of connected WebSockets

export function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    ws.id = uuidv4();
    ws.lobbyId = null;

    ws.on('message', (msg) => {
      const data = JSON.parse(msg);
      handleMessage(ws, data);
    });

    ws.on('close', () => {
      if (ws.lobbyId && lobbiesWS[ws.lobbyId]) {
        lobbiesWS[ws.lobbyId].delete(ws);
      }
    });
  });
}

function handleMessage(ws, data) {
  switch (data.type) {
    case 'joinLobby':
      ws.lobbyId = data.lobbyId;
      if (!lobbiesWS[data.lobbyId]) lobbiesWS[data.lobbyId] = new Set();
      lobbiesWS[data.lobbyId].add(ws);

      broadcastToLobby(data.lobbyId, { type: 'lobbyUpdate', players: Array.from(lobbiesWS[data.lobbyId]).map(w => w.id) });
      break;

    case 'playCard':
      // Hier später Game-Logik einbinden
      broadcastToLobby(ws.lobbyId, { type: 'cardPlayed', card: data.card, playerId: ws.id });
      break;
  }
}

function broadcastToLobby(lobbyId, message) {
  if (!lobbiesWS[lobbyId]) return;
  const msgStr = JSON.stringify(message);
  lobbiesWS[lobbyId].forEach(ws => ws.send(msgStr));
}