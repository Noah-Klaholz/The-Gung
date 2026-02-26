import { Hand } from 'pokersolver';

export interface Card {
    rank: string;
    suit: string;
}
export function toSolverFormat(card: Card): string {
    let r = card.rank;
    // pokersolver erwartet 'T' für 10.
    if (r === "10") r = "T";
    r = r.toUpperCase();

    // pokersolver erwartet 'h', 'd', 's', 'c' (kleingeschrieben)
    const s = card.suit.charAt(0).toLowerCase();

    return `${r}${s}`;
}

export function resolveGangHand(pocketCards: Card[], communityCards: Card[]): any {
    const pocketSolver = pocketCards.map(toSolverFormat);
    const commSolver = communityCards.map(toSolverFormat);

    // Wir bewerten das Board alleine
    const boardHand = Hand.solve(commSolver);

    // Wir bewerten das Board + die Handkarten des Spielers
    const combinedHand = Hand.solve([...pocketSolver, ...commSolver]);

    const winners = Hand.winners([boardHand, combinedHand]);

    // Wenn es ein Tie ist (also winners.length === 2), spielt der Spieler exakt das Board.
    if (winners.length === 2) {
        // Sonderregel greift: Er muss jetzt nur mit seinen Pocket Cards spielen!
        return Hand.solve(pocketSolver);
    }
    return combinedHand;
}

//Gibt saubere Infos über die beste Hand des Spielers zurück.
export function evaluateBestHand(pocketCards: Card[], communityCards: Card[]) {
    const hand = resolveGangHand(pocketCards, communityCards);
    return {
        name: hand.name as string,
        descr: hand.descr as string,
        rank: hand.rank as number,
        cards: hand.cards.map((c: any) => c.value + c.suit) as string[]
    };
}
//Vergleicht zwei Spieler miteinander.

export function isHandBetterStrictly(handAPocket: Card[], handBPocket: Card[], communityCards: Card[]): boolean {
    const handA = resolveGangHand(handAPocket, communityCards);
    const handB = resolveGangHand(handBPocket, communityCards);
    const winners = Hand.winners([handA, handB]);
    return winners.length === 1 && winners[0] === handA;
}

//Erstellt die Reihenfolge der Spieler.
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
 * Generiert die Rankings für alle Spieler.
 * Schwächste Hand = Rang 1.
 * Gleiche Hände bekommen den exakt gleichen trueRank.
 */
export function generateTrueRanks(playerHands: { playerId: string, pocket: Card[] }[], communityCards: Card[]) {

    const evals = playerHands.map(p => ({
        playerId: p.playerId,
        hand: resolveGangHand(p.pocket, communityCards)
    }));

    evals.sort((a, b) => {
        const winners = Hand.winners([a.hand, b.hand]);

        if (winners.length === 2) return 0;

        return winners[0] === a.hand ? 1 : -1;
    });

    let currentTrueRank = 1;
    const result: { playerId: string; trueRank: number; descr: string }[] = [];

    // 3. Ränge zuteilen
    evals.forEach((e, i) => {
        if (i > 0) {
            const prev = evals[i - 1];
            const winners = Hand.winners([prev.hand, e.hand]);

            // Wenn der aktuelle (e) strikt stärker ist als der vorherige (prev),
            // dann wird der globale Truerank auf seinen Index+1 hochgeschaltet.
            // Ist er gleich stark, behält er einfach den aktuellen trueRank.
            if (winners.length === 1 && winners[0] === e.hand) {
                currentTrueRank = i + 1;
            }
        }

        result.push({
            playerId: e.playerId,
            trueRank: currentTrueRank,
            descr: e.hand.descr
        });
    });

    return result;
}
