/* Dictator game: the participant divides an endowment between themselves and one other
player. Follows the instrument contract in docs/style-guide/05-instruments.md. */

import type {
    InstrumentConfig,
    InstrumentModel,
    Status,
} from "#lib/common/Instrument/v1/Instrument.ts";

export const DICTATOR_GAME_KIND = "dictator-game";

/* Instrument shapes */

export interface DictatorGamePublic {
    questionText: string; // Plain text
    endowment: number; // Points the participant divides. Positive integer.
    step: number; // Difference between adjacent amounts. Positive integer that divides `endowment`.
}

export interface DictatorGameResponse {
    given: number | null; // Points given to the other player. null: no amount selected.
    confirmed: boolean; // True: the decision is final
}

/* Factory */

/** Build the instrument config in `load`. */
export function buildDictatorGame(
    id: string,
    pub: DictatorGamePublic,
): InstrumentConfig<DictatorGamePublic> {
    const { endowment, step } = pub;
    if (!Number.isInteger(endowment) || endowment <= 0) {
        throw new Error(`Dictator game ${id}: endowment must be a positive integer`);
    }
    if (!Number.isInteger(step) || step <= 0 || endowment % step !== 0) {
        throw new Error(`Dictator game ${id}: step must be a positive integer dividing endowment`);
    }
    return { id, kind: DICTATOR_GAME_KIND, public: { ...pub } };
}

/* Model */

export function emptyResponse(_pub?: DictatorGamePublic): DictatorGameResponse {
    return { given: null, confirmed: false };
}

export function parseResponse(pub: DictatorGamePublic, raw: unknown): DictatorGameResponse | null {
    if (typeof raw !== "object" || raw === null) return null;
    const { given, confirmed } = raw as Record<string, unknown>;
    if (typeof confirmed !== "boolean") return null;
    if (given === null) return confirmed ? null : { given: null, confirmed: false };
    if (typeof given !== "number" || !isAmount(pub, given)) return null;
    return { given, confirmed };
}

export function status(_pub: DictatorGamePublic, response: DictatorGameResponse): Status {
    if (response.given === null) return "empty";
    return response.confirmed ? "complete" : "partial";
}

export const model: InstrumentModel<DictatorGamePublic, undefined, DictatorGameResponse> = {
    kind: DICTATOR_GAME_KIND,
    emptyResponse,
    parseResponse,
    status,
};

/* Queries */

/** Every amount the participant can give, ascending: 0, step, …, endowment. */
export function amounts(pub: DictatorGamePublic): number[] {
    return Array.from({ length: pub.endowment / pub.step + 1 }, (_, index) => index * pub.step);
}

export function isAmount(pub: DictatorGamePublic, amount: number): boolean {
    return Number.isInteger(amount)
        && amount >= 0
        && amount <= pub.endowment
        && amount % pub.step === 0;
}

/** Points the participant keeps, or null if no amount is selected. */
export function kept(pub: DictatorGamePublic, response: DictatorGameResponse): number | null {
    return response.given === null ? null : pub.endowment - response.given;
}

/* Commands. A confirmed decision is final, so a complete response never becomes incomplete. */

export function selectAmount(
    pub: DictatorGamePublic,
    response: DictatorGameResponse,
    amount: number,
): void {
    if (response.confirmed || !isAmount(pub, amount)) return;
    response.given = amount;
}

export function confirmDecision(_pub: DictatorGamePublic, response: DictatorGameResponse): void {
    if (response.given === null) return;
    response.confirmed = true;
}
