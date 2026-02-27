import PokerSolver from 'pokersolver';
import type { Card } from "./Card.js";

const { Hand } = PokerSolver as any;


export function resolveGangHand(
    pocketCards: Card[],
    communityCards: Card[]
) {
    const pocketSolver = pocketCards.map(c => c.rank + c.suit);
    const commSolver = communityCards.map(c => c.rank + c.suit);

    const boardHand = Hand.solve(commSolver);
    const combinedHand = Hand.solve([...pocketSolver, ...commSolver]);

    const winners = Hand.winners([boardHand, combinedHand]);

    if (winners.length === 2) {
        return Hand.solve(pocketSolver);
    }

    return combinedHand;
}

// Returns clean information about the player's best hand.
export function evaluateBestHand(pocketCards: Card[], communityCards: Card[]) {
    const hand = resolveGangHand(pocketCards, communityCards);
    return {
        name: hand.name as string,
        descr: hand.descr as string,
        rank: hand.rank as number,
        cards: hand.cards.map((c: any) => c.value + c.suit) as string[]
    };
}
// Compares two players against each other.

export function isHandBetterStrictly(handAPocket: Card[], handBPocket: Card[], communityCards: Card[]): boolean {
    const handA = resolveGangHand(handAPocket, communityCards);
    const handB = resolveGangHand(handBPocket, communityCards);
    const winners = Hand.winners([handA, handB]);
    return winners.length === 1 && winners[0] === handA;
}

// Builds the ordering validation for player hands.
export function evaluateShowdownSequence(orderedPlayerHands: Card[][], communityCards: Card[]): boolean {
    if (orderedPlayerHands.length <= 1) return true;

    for (let i = 1; i < orderedPlayerHands.length; i++) {
        const prev = resolveGangHand(orderedPlayerHands[i - 1], communityCards);
        const curr = resolveGangHand(orderedPlayerHands[i], communityCards);
        const winners = Hand.winners([prev, curr]);

        if (winners.length === 1 && winners[0] === prev) {
            return false;
        }
    }
    return true;
}

/**
 * Generates rankings for all players.
 * Weakest hand = rank 1.
 * Equal hands receive the exact same trueRank.
 */
export function generateTrueRanks(
    playerHands: { playerId: string; pocket: Card[] }[],
    communityCards: Card[]
) {
    const evaluated = playerHands.map(p => ({
        playerId: p.playerId,
        hand: resolveGangHand(p.pocket, communityCards)
    }));

    // Sort weakest → strongest
    evaluated.sort((a, b) => {
        const winners = Hand.winners([a.hand, b.hand]);

        if (winners.length === 2) return 0; // tie

        return winners[0] === a.hand ? 1 : -1;
    });

    const results: {
        playerId: string;
        trueRank: number;
        descr: string;
    }[] = [];

    let currentRank = 1;

    for (let i = 0; i < evaluated.length; i++) {
        if (i > 0) {
            const prev = evaluated[i - 1];
            const curr = evaluated[i];

            const winners = Hand.winners([prev.hand, curr.hand]);

            // If strictly stronger → increase rank
            if (winners.length === 1 && winners[0] === curr.hand) {
                currentRank++;
            }
        }

        results.push({
            playerId: evaluated[i].playerId,
            trueRank: currentRank,
            descr: evaluated[i].hand.descr
        });
    }

    return results;
}