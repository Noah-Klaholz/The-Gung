import { Card, Suit, Rank, SUITS, RANKS } from "./utils/Card.ts"

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

export function shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Single or multiple card draw overloads
export function drawCard(deck: Card[]): Card;
export function drawCard(deck: Card[], amount: number): Card[];
export function drawCard(deck: Card[], amount?: number): Card | Card[] {
    if (amount === undefined) {
        // Draw a single card
        const card = deck.pop();
        if (!card) throw new Error("Deck is empty!");
        return card;
    } else {
        if (amount > deck.length) throw new Error("Not enough cards in the deck!");
        const cards: Card[] = [];
        for (let i = 0; i < amount; i++) {
            const card = deck.pop();
            if (!card) throw new Error("Deck ran out of cards unexpectedly!");
            cards.push(card);
        }
        return cards;
    }
}

