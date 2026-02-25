import express from 'express';
import lobbyRoutes from './routes/lobby.js';

const router = express.Router();

// Beispiel: Lobby routes
router.use('/lobby', lobbyRoutes);

export default router;