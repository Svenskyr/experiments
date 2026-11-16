/* Shared instrument contract. See docs/style-guide/05-instruments.md. */

export type Status = "empty" | "partial" | "complete";

export interface InstrumentConfig<P, K = undefined> {
    id: string;
    kind: string; // Selects the model on the server
    public: P; // The participant may see this
    key?: K | undefined; // Answers and scoring. Present only where grading runs.
}

/** What `load` returns when the key stays on the server. Has no `key` field. */
export interface ClientInstrumentConfig<P> {
    id: string;
    kind: string;
    public: P;
}

export interface InstrumentModel<P, K, R, G = undefined> {
    kind: string;
    emptyResponse(pub: P): R;
    parseResponse(pub: P, raw: unknown): R | null; // null: rejected
    status(pub: P, response: R, grade?: G): Status;
    grade?(pub: P, key: K, response: R): G;
}

export function withoutKey<P, K>(config: InstrumentConfig<P, K>): ClientInstrumentConfig<P> {
    return { id: config.id, kind: config.kind, public: config.public };
}
