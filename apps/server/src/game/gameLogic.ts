import * as dm from "./DeckManager";
import * as pe from "./PokerEvaluator";
import { Card } from "./utils/Card"

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  trueRank: number;
  chips: number[];
}

export type GamePhase =
  | "pre-flop"
  | "flop"
  | "turn"
  | "River"
  | "Showdown"
  | "Finished";

export class gameLogic {
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  roundChips: number[];
  phase: GamePhase;

  constructor(players: Player[]) {
    this.players = players.map((p) => ({
      ...p,
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
    this.phase = "pre-flop";
  }

  startGame() {
    for (const player of this.players) {
      player.hand = dm.drawCard(this.deck, 2);
    }
    this.communityCards = dm.drawCard(this.deck, 5);

    pe.generateTrueRanks(
      this.players.map((p) => ({
        playerId: p.id,
        pocket: p.hand,
      })),
      this.communityCards,
    );
  }
}
