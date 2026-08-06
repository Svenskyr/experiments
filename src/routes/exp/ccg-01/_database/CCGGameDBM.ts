import debugLib from "debug";
const debug = debugLib("ccg-01:_database:CCGGame");
import { browser } from "$app/environment";
import type {
    GameSession,
    PermutationTracker,
    RoundRecord,
    StoredCCGGame,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";
import { getAvatar } from "$lib/exp/games/ccg/v2/avatars/avatars.ts";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    type SyncHandler,
} from "../_syncHandler/v3/SyncHandler.ts";
import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "../_syncHandler/v3/SyncHandlerActions.ts";

export const gameStorageKey = "exp_ccg_01:ccg-game";
export const roundsStorageKey = "exp_ccg_01:game-rounds";
/** @deprecated Use roundsStorageKey */
export const storageKey = roundsStorageKey;

const LEGACY_PERMUTATION_KEY = "ccg-v2-permutationTracker";
const LEGACY_AVATAR_KEY = "selectedAvatar";

type StoredCCGGameData = {
    permutationTracker?: PermutationTracker;
    selectedAvatar?: StoredCCGGame["selectedAvatar"];
};

type GameRoundSubmission = {
    local_round_number: number;
    player_1_avatar: string;
    player_2_avatar: string;
    choice_option_1: string;
    choice_option_2: string;
    player_1_chose: string;
    choice_option_1_prediction: number;
    time_elapsed_seconds: number;
};

type SyncedRound = { local_round_number: number; rid: number };

function loadGameData(): StoredCCGGameData | null {
    return loadFromLocalStorage<StoredCCGGameData>(gameStorageKey);
}

function saveGameData(data: StoredCCGGameData): void {
    saveToLocalStorage(gameStorageKey, data);
}

export function loadRounds(): RoundRecord[] | null {
    return loadFromLocalStorage<RoundRecord[]>(roundsStorageKey) ?? null;
}

function saveRounds(rounds: RoundRecord[]): void {
    saveToLocalStorage(roundsStorageKey, rounds);
}

function migrateLegacyGameData(): StoredCCGGameData | null {
    if (loadGameData()) return null;

    let migrated = false;
    const data: StoredCCGGameData = {};

    if (browser) {
        const legacyTracker = localStorage.getItem(LEGACY_PERMUTATION_KEY);
        if (legacyTracker) {
            try {
                data.permutationTracker = JSON.parse(legacyTracker) as PermutationTracker;
                migrated = true;
            } catch {
                debug("failed to parse legacy permutation tracker from localStorage");
            }
        }

        if (localStorage.getItem(LEGACY_AVATAR_KEY)) {
            const avatar = getAvatar();
            if (avatar) {
                data.selectedAvatar = avatar;
                migrated = true;
            }
        }
    }

    if (!migrated) return null;

    saveGameData(data);
    debug("migrated legacy ccg game data to", gameStorageKey);
    return data;
}

export function load(): StoredCCGGame | null {
    const gameData = loadGameData() ?? migrateLegacyGameData();
    const rounds = loadRounds();

    if (!gameData && !rounds) return null;

    return {
        permutationTracker: gameData?.permutationTracker,
        selectedAvatar: gameData?.selectedAvatar,
        rounds: rounds ?? undefined,
    };
}

export function save(session: GameSession): void {
    saveGameData({
        permutationTracker: session.permutationTracker,
        selectedAvatar: session.selectedAvatar,
    });
    saveRounds(session.rounds);
}

/** @deprecated Use save(session) — appends a single round for v2 compatibility */
export function saveRoundRecord(record: RoundRecord): void {
    const records = loadRounds() ?? [];
    records.push(record);
    saveRounds(records);
}

export function getUnsynced(): RoundRecord[] {
    return (loadRounds() ?? []).filter((record) => record.rid === null);
}

export function applySyncedRids(synced: SyncedRound[]): void {
    if (synced.length === 0) return;

    const ridByLocalRound = new Map(
        synced.map((row) => [row.local_round_number, row.rid]),
    );
    const records = (loadRounds() ?? []).map((record) => {
        const rid = ridByLocalRound.get(record.local_round_number);
        return rid !== undefined ? { ...record, rid } : record;
    });
    saveRounds(records);
}

export function sync(syncHandler: SyncHandler): void {
    if (getUnsynced().length === 0) return;
    syncHandler.enqueue(roundsStorageKey, "submitGameRounds");
}

function toSubmissionPayload(record: RoundRecord): GameRoundSubmission {
    if (record.player_1_chose == null) {
        throw new Error(
            `Round ${record.local_round_number} missing player_1_chose; cannot sync.`,
        );
    }
    if (record.choice_option_1_prediction == null) {
        throw new Error(
            `Round ${record.local_round_number} missing prediction; cannot sync.`,
        );
    }

    if (record.choice_option_1_prediction > 1) {
        record.choice_option_1_prediction = record.choice_option_1_prediction / 100;
    }

    return {
        local_round_number: record.local_round_number,
        player_1_avatar: record.player_1_avatar,
        player_2_avatar: record.player_2_avatar,
        choice_option_1: record.choice_option_1,
        choice_option_2: record.choice_option_2,
        player_1_chose: record.player_1_chose,
        choice_option_1_prediction: record.choice_option_1_prediction,
        time_elapsed_seconds: record.time_elapsed_seconds,
    };
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
    return error.code === "23505" || (error.message?.includes("duplicate key") ?? false);
}

async function fetchExistingRids(
    syncHandler: SyncHandler,
    localRoundNumbers: number[],
): Promise<{ data: SyncedRound[] | null; error: PostgrestError | null }> {
    const { data, error } = await syncHandler.db!
        .schema(syncHandler.scope)
        .from("game_rounds")
        .select("rid, local_round_number")
        .in("local_round_number", localRoundNumbers);

    if (error) {
        return { data: null, error };
    }
    return { data: data ?? [], error: null };
}

export async function submit(
    syncHandler: SyncHandler,
    key: string,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    if (!syncHandler.ready || !syncHandler.db) {
        return { data: null, error: notReadyError() };
    }

    const unsynced = getUnsynced();
    if (unsynced.length === 0) {
        return { data: [], error: null };
    }

    const payloads = unsynced.map(toSubmissionPayload);
    const localRoundNumbers = payloads.map((payload) => payload.local_round_number);

    syncHandler.debug(`Submitting ${payloads.length} game round(s) for ${key}`);
    const { data, error } = await syncHandler.db
        .schema(syncHandler.scope)
        .rpc("submit_game_rounds", { rounds: payloads });

    if (!error) {
        if (Array.isArray(data) && data.length > 0) {
            applySyncedRids(data as SyncedRound[]);
        } else {
            const existing = await fetchExistingRids(syncHandler, localRoundNumbers);
            if (existing.error) {
                debug("Error fetching existing game round rids", existing.error);
                return { data: null, error: existing.error };
            }
            applySyncedRids(existing.data ?? []);
        }
        debug("Game rounds synced", data);
        return { data, error: null };
    }

    if (error && isUniqueViolation(error)) {
        const existing = await fetchExistingRids(syncHandler, localRoundNumbers);
        if (existing.error) {
            debug("Error fetching existing game round rids", existing.error);
            return { data: null, error: existing.error };
        }
        applySyncedRids(existing.data!);
        debug("Applied existing game round rids after unique violation", existing.data);
        return { data: existing.data, error: null };
    }

    debug("Error submitting game rounds", error);
    return { data: null, error: error ?? noPayloadError(key) };
}
