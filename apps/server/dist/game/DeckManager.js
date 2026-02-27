import { SUITS, RANKS } from "./utils/Card.js";
export function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}
export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}
export function drawCard(deck, amount) {
    if (amount === undefined) {
        // Draw a single card
        const card = deck.pop();
        if (!card)
            throw new Error("Deck is empty!");
        return card;
    }
    else {
        if (amount > deck.length)
            throw new Error("Not enough cards in the deck!");
        const cards = [];
        for (let i = 0; i < amount; i++) {
            const card = deck.pop();
            if (!card)
                throw new Error("Deck ran out of cards unexpectedly!");
            cards.push(card);
        }
        return cards;
    }
}
