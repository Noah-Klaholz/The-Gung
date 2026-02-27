import * as dm from "./DeckManager.js";
import * as pe from "./utils/PokerEvaluator.js";
const ROUND_SEQUENCE = [
    { phase: "pre-flop", color: "white", visibleCommunityCards: 0 },
    { phase: "flop", color: "yellow", visibleCommunityCards: 3 },
    { phase: "turn", color: "orange", visibleCommunityCards: 4 },
    { phase: "river", color: "red", visibleCommunityCards: 5 },
];
export class gameLogic {
    constructor(lobbyPlayers) {
        this.players = lobbyPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            hand: [],
            trueRank: 1,
            chips: {
                white: null,
                yellow: null,
                orange: null,
                red: null,
            },
        }));
        this.deck = dm.createDeck();
        dm.shuffleDeck(this.deck);
        this.communityCards = [];
        this.roundChips = [];
        this.successes = 0;
        this.failures = 0;
        this.heistNumber = 0;
        this.revision = 0;
        this.lastHeistResult = null;
        this.roundIndex = 0;
        this.phase = "init";
    }
    startGame() {
        this.successes = 0;
        this.failures = 0;
        this.heistNumber = 0;
        this.lastHeistResult = null;
        this.startHeist();
    }
    startHeist() {
        if (this.phase === "finished") {
            return;
        }
        this.heistNumber += 1;
        this.deck = dm.createDeck();
        dm.shuffleDeck(this.deck);
        for (const player of this.players) {
            player.hand = dm.drawCard(this.deck, 2);
            player.chips.white = null;
            player.chips.yellow = null;
            player.chips.orange = null;
            player.chips.red = null;
        }
        this.communityCards = dm.drawCard(this.deck, 5);
        const ranking = pe.generateTrueRanks(this.players.map((p) => ({
            playerId: p.id,
            pocket: p.hand,
        })), this.communityCards);
        for (const result of ranking) {
            const player = this.players.find((p) => p.id === result.playerId);
            if (player) {
                player.trueRank = result.trueRank;
            }
        }
        this.roundIndex = 0;
        this.phase = ROUND_SEQUENCE[this.roundIndex].phase;
        this.roundChips = this.createRoundChipPool();
        this.bumpRevision();
    }
    applyChipAction(playerId, action) {
        if (this.phase === "init" || this.phase === "showdown" || this.phase === "finished") {
            return { ok: false, error: "Chip action not allowed in current phase" };
        }
        const round = ROUND_SEQUENCE[this.roundIndex];
        const actor = this.players.find((player) => player.id === playerId);
        if (!actor) {
            return { ok: false, error: "Player not found in game" };
        }
        const color = round.color;
        if (action.type === "take_center") {
            const chipIndex = this.roundChips.indexOf(action.star);
            if (chipIndex === -1) {
                return { ok: false, error: "Requested chip is not available in center" };
            }
            const ownCurrentChip = actor.chips[color];
            if (ownCurrentChip !== null) {
                this.roundChips.push(ownCurrentChip);
            }
            this.roundChips.splice(chipIndex, 1);
            actor.chips[color] = action.star;
        }
        if (action.type === "take_player") {
            const fromPlayer = this.players.find((player) => player.id === action.fromPlayerId);
            if (!fromPlayer) {
                return { ok: false, error: "Source player not found" };
            }
            if (fromPlayer.id === actor.id) {
                return { ok: false, error: "Cannot take chip from self" };
            }
            const stolenChip = fromPlayer.chips[color];
            if (stolenChip === null) {
                return { ok: false, error: "Source player has no chip to take" };
            }
            const ownCurrentChip = actor.chips[color];
            if (ownCurrentChip !== null) {
                this.roundChips.push(ownCurrentChip);
            }
            actor.chips[color] = stolenChip;
            fromPlayer.chips[color] = null;
        }
        if (action.type === "return_own") {
            const ownCurrentChip = actor.chips[color];
            if (ownCurrentChip === null) {
                return { ok: false, error: "No chip to return" };
            }
            this.roundChips.push(ownCurrentChip);
            actor.chips[color] = null;
        }
        this.roundChips.sort((a, b) => a - b);
        this.bumpRevision();
        const heistResolved = this.advanceAfterAction();
        const gameEnded = this.isGameOver();
        return {
            ok: true,
            heistResolved,
            gameEnded,
        };
    }
    getPublicState() {
        const visibleCommunityCards = this.getVisibleCommunityCards();
        return {
            phase: this.phase,
            heistNumber: this.heistNumber,
            successes: this.successes,
            failures: this.failures,
            revision: this.revision,
            roundChips: [...this.roundChips].sort((a, b) => a - b),
            communityCards: visibleCommunityCards,
            players: this.players.map((player) => ({
                id: player.id,
                name: player.name,
                chips: { ...player.chips },
            })),
            lastHeistResult: this.lastHeistResult,
        };
    }
    getPrivateState(playerId) {
        const player = this.players.find((entry) => entry.id === playerId);
        if (!player) {
            return null;
        }
        return {
            playerId,
            hand: player.hand,
        };
    }
    advanceAfterAction() {
        if (this.phase === "init" || this.phase === "showdown" || this.phase === "finished") {
            return null;
        }
        const round = ROUND_SEQUENCE[this.roundIndex];
        const everyoneHasChip = this.players.every((player) => player.chips[round.color] !== null);
        if (!everyoneHasChip) {
            return null;
        }
        if (this.roundIndex < ROUND_SEQUENCE.length - 1) {
            this.roundIndex += 1;
            this.phase = ROUND_SEQUENCE[this.roundIndex].phase;
            this.roundChips = this.createRoundChipPool();
            this.bumpRevision();
            return null;
        }
        this.phase = "showdown";
        this.bumpRevision();
        const heistResult = this.resolveShowdown();
        if (this.successes >= 3 || this.failures >= 3) {
            this.phase = "finished";
            this.bumpRevision();
            return heistResult;
        }
        this.startHeist();
        return heistResult;
    }
    resolveShowdown() {
        const orderedPlayers = [...this.players].sort((a, b) => {
            const aChip = a.chips.red ?? Number.MAX_SAFE_INTEGER;
            const bChip = b.chips.red ?? Number.MAX_SAFE_INTEGER;
            return aChip - bChip;
        });
        const orderedPlayerHands = orderedPlayers.map((player) => player.hand);
        const isSuccess = pe.evaluateShowdownSequence(orderedPlayerHands, this.communityCards);
        const orderedShowdown = orderedPlayers.map((player) => {
            const hand = pe.evaluateBestHand(player.hand, this.communityCards);
            return {
                playerId: player.id,
                playerName: player.name,
                redChip: player.chips.red ?? -1,
                handName: hand.name,
                handDescription: hand.descr,
                bestHandCards: hand.cards,
                trueRank: player.trueRank,
            };
        });
        if (isSuccess) {
            this.successes += 1;
        }
        else {
            this.failures += 1;
        }
        const result = {
            heistNumber: this.heistNumber,
            success: isSuccess,
            orderedShowdown,
            successes: this.successes,
            failures: this.failures,
        };
        this.lastHeistResult = result;
        this.bumpRevision();
        return result;
    }
    getVisibleCommunityCards() {
        const visible = this.phase === "init" || this.phase === "finished"
            ? 0
            : this.phase === "pre-flop"
                ? 0
                : this.phase === "flop"
                    ? 3
                    : this.phase === "turn"
                        ? 4
                        : 5;
        return this.communityCards.slice(0, visible);
    }
    createRoundChipPool() {
        return Array.from({ length: this.players.length }, (_, index) => index + 1);
    }
    bumpRevision() {
        this.revision += 1;
    }
    isGameOver() {
        return this.successes >= 3 || this.failures >= 3;
    }
    getWinnerState() {
        if (!this.isGameOver()) {
            return null;
        }
        return {
            won: this.successes >= 3,
            successes: this.successes,
            failures: this.failures,
        };
    }
}
