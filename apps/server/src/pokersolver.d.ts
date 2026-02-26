declare module 'pokersolver' {
    export class Hand {
        static solve(cards: string[], game?: string, canDisqualify?: boolean): any;
        static winners(hands: any[]): any[];

        name: string;
        descr: string;
        rank: number;
        cards: any[];
    }
}
