import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const lobbies = {}; // einfaches In-Memory-Objekt für Test

// Lobby erstellen
router.post('/create', (req, res) => {
  const lobbyId = uuidv4();
  lobbies[lobbyId] = {
    id: lobbyId,
    players: [],
    status: 'waiting'
  };
  res.json({ lobbyId });
});

// Lobby beitreten
router.post('/join', (req, res) => {
  const { lobbyId, playerName } = req.body;
  if (!lobbies[lobbyId]) return res.status(404).json({ error: 'Lobby nicht gefunden' });

  const playerId = uuidv4();
  lobbies[lobbyId].players.push({ id: playerId, name: playerName });
  res.json({ playerId, lobbyId });
});

export default router;