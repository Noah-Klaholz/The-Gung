import { gameLogic } from "./gameLogic.js";
export class GameManager {
    constructor() {
        this.activeGames = new Map();
    }
    startGame(lobby) {
        const playerArr = Array.from(lobby.players.values());
        const game = new gameLogic(playerArr);
        game.startGame();
        this.activeGames.set(lobby.joinCode, { lobbyCode: lobby.joinCode, game });
    }
    getGame(lobbyCode) {
        return this.activeGames.get(lobbyCode); // can return undefined
    }
    applyChipAction(lobbyCode, playerId, action) {
        const activeGame = this.activeGames.get(lobbyCode);
        if (!activeGame) {
            return {
                ok: false,
                error: "Game not found",
                heistResolved: null,
                gameEnded: false,
            };
        }
        const result = activeGame.game.applyChipAction(playerId, action);
        if (!result.ok) {
            return {
                ok: false,
                error: result.error,
                heistResolved: null,
                gameEnded: false,
            };
        }
        return {
            ok: true,
            heistResolved: result.heistResolved ?? null,
            gameEnded: result.gameEnded ?? false,
        };
    }
    getPublicState(lobbyCode) {
        const activeGame = this.activeGames.get(lobbyCode);
        if (!activeGame) {
            return null;
        }
        return activeGame.game.getPublicState();
    }
    getPrivateState(lobbyCode, playerId) {
        const activeGame = this.activeGames.get(lobbyCode);
        if (!activeGame) {
            return null;
        }
        return activeGame.game.getPrivateState(playerId);
    }
    getGameResult(lobbyCode) {
        const activeGame = this.activeGames.get(lobbyCode);
        if (!activeGame) {
            return null;
        }
        return activeGame.game.getWinnerState();
    }
    endGame(lobbyCode) {
        this.activeGames.delete(lobbyCode);
    }
}
