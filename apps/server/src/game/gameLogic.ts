import * as dm from "./DeckManager.ts";
import * as pe from "./utils/PokerEvaluator.ts";
import type { Card } from "./utils/Card.ts";
import type { LobbyPlayer } from "../lobby/lobbyManager.ts";

export interface GamePlayer {
  id: string;
  name: string;
  hand: Card[];
  trueRank: number;
  chips: number[];
}

export type GamePhase =
  | "init"
  | "pre-flop"
  | "flop"
  | "turn"
  | "River"
  | "Showdown"
  | "Finished";

export class gameLogic {
  players: GamePlayer[];
  deck: Card[];
  communityCards: Card[];
  roundChips: number[];
  phase: GamePhase;

  constructor(lobbyPlayers: LobbyPlayer[]) {
    this.players = lobbyPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      hand: [],
      trueRank: 1,
      chips: [],
    }));

    this.deck = dm.createDeck();
    dm.shuffleDeck(this.deck);

    this.communityCards = [];

    this.roundChips = Array.from(
      { length: this.players.length },
      (_, i) => i + 1,
    );

    this.phase = "init";
  }

  startGame() {
    for (const player of this.players) {
      player.hand = dm.drawCard(this.deck, 2);
    }
    this.communityCards = dm.drawCard(this.deck, 5);

    const ranking = pe.generateTrueRanks(
      this.players.map((p) => ({
        playerId: p.id,
        pocket: p.hand,
      })),
      this.communityCards,
    );

    for (const result of ranking) {
      const player = this.players.find((p) => p.id === result.playerId);
      if (player) {
        player.trueRank = result.trueRank;
      }
    }

    this.phase = "pre-flop";
  }
}
