import debugLib from "debug";
const debug = debugLib("exp:ccg-01:SyncHandler");

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../../../../database.types.ts";
import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { getContext, setContext } from "svelte";
import {
    classifySyncError,
    parseRecordBook,
    requiresAuth,
    type SyncRecordBook,
} from "../v1/interfaces.ts";

const RETRY_DELAY_MS = 30_000;

function isEligibleForRetry(lastAttemptAt: string | null, now: number): boolean {
    if (!lastAttemptAt) return true;
    return now - Date.parse(lastAttemptAt) >= RETRY_DELAY_MS;
}
export const SYNC_HANDLER_KEY = Symbol("ccg-01:syncHandler");
export function setSyncHandler(syncHandler: SyncHandler) {
    setContext(SYNC_HANDLER_KEY, syncHandler);
}
export function getSyncHandler() {
    return getContext(SYNC_HANDLER_KEY);
}

export interface SyncRequest {
    key: string;
    payload: unknown;
    operationId: string | undefined;
}

export type SyncOperation = (
    client: SupabaseClient<Database> | null | undefined,
    authUserId: string | null | undefined,
    payload: unknown,
) => Promise<{ error: string | null }>;

export class SyncHandler {
    readonly dbClient: SupabaseClient<Database> | null = null;
    #queue: SyncRecordBook = {};
    #active = false;
    #retryTimer: ReturnType<typeof setTimeout> | null = null;
    #sessionUserId: string | null = null;
    #expState: ExperimentState | null = null;

    constructor(dbClient?: SupabaseClient<Database>) {
        debug("SyncHandler constructor", dbClient);
        this.dbClient = dbClient ?? null;
        this.rebuildQueue();
        void this.#initAuth();
    }

    async #initAuth(): Promise<void> {
        if (!this.dbClient) return;
        const { data: { session } } = await this.dbClient.auth.getSession();
        this.#sessionUserId = session?.user?.id ?? null;
        this.dbClient.auth.onAuthStateChange((_event, session) => {
            this.#sessionUserId = session?.user?.id ?? null;
            if (session?.user?.id) {
                this.startQueue();
            } else {
                this.#clearRetryTimer();
            }
        });
    }

    get #authUserId(): string | null {
        return this.#sessionUserId;
    }

    rebuildQueue(): void {
        debug("Rebuilding queue");
        const recordBook = localStorage.getItem("syncHandler:recordBook");
        if (recordBook) {
            this.#queue = parseRecordBook(recordBook);
        } else {
            this.#queue = {};
        }
    }

    async resumePending(): Promise<void> {
        this.rebuildQueue();
        if (!this.dbClient) return;
        const { data: { session } } = await this.dbClient.auth.getSession();
        this.#sessionUserId = session?.user?.id ?? null;
        if (this.#authUserId) {
            this.startQueue();
        }
    }

    #persistRecordBook(): void {
        localStorage.setItem("syncHandler:recordBook", JSON.stringify(this.#queue));
    }

    enqueue(key: string, operationId: string, payload: unknown): void {
        debug("SyncHandler enqueue", operationId, payload);
        localStorage.setItem(key, JSON.stringify(payload));
        this.#queue[key] = {
            syncedAt: null,
            lastAttemptAt: null,
            lastError: null,
            operationId,
        };

        this.#persistRecordBook();
        this.startQueue();
    }

    dequeue(key: string): void {
        delete this.#queue[key];
        this.#persistRecordBook();
    }

    startQueue(): void {
        if (this.#active) return;
        this.#clearRetryTimer();
        this.#active = true;
        void this.processQueue();
    }

    #pickNextKey(): string | null {
        const now = Date.now();
        for (const key of Object.keys(this.#queue)) {
            const entry = this.#queue[key];
            if (!isEligibleForRetry(entry.lastAttemptAt, now)) continue;
            if (requiresAuth(entry.operationId) && !this.#authUserId) continue;
            return key;
        }
        return null;
    }

    #earliestRetryEligibleAt(): number | null {
        const now = Date.now();
        let earliest: number | null = null;
        for (const entry of Object.values(this.#queue)) {
            if (!entry.lastAttemptAt) continue;
            const eligibleAt = Date.parse(entry.lastAttemptAt) + RETRY_DELAY_MS;
            if (eligibleAt <= now) continue;
            if (earliest === null || eligibleAt < earliest) earliest = eligibleAt;
        }
        return earliest;
    }

    #hasAuthBlockedItems(): boolean {
        return Object.values(this.#queue).some(
            (entry) => requiresAuth(entry.operationId) && !this.#authUserId,
        );
    }

    #clearRetryTimer(): void {
        if (this.#retryTimer === null) return;
        clearTimeout(this.#retryTimer);
        this.#retryTimer = null;
    }

    #scheduleRetry(): void {
        this.#clearRetryTimer();
        if (!this.#authUserId) return;

        const nextAt = this.#earliestRetryEligibleAt();
        if (!nextAt) return;

        const delay = Math.max(0, nextAt - Date.now());
        this.#retryTimer = setTimeout(() => {
            this.#retryTimer = null;
            this.startQueue();
        }, delay);
    }

    async processQueue(): Promise<void> {
        try {
            while (true) {
                const key = this.#pickNextKey();
                if (!key) break;

                const item = this.#queue[key];
                if (requiresAuth(item.operationId) && !this.#authUserId) {
                    break;
                }

                if (!item.operationId) {
                    this.dequeue(key);
                    continue;
                }

                const operation = syncOperations[item.operationId];
                if (!operation) {
                    this.dequeue(key);
                    continue;
                }

                const payload = localStorage.getItem(key);
                if (!payload) {
                    this.dequeue(key);
                    continue;
                }

                if (requiresAuth(item.operationId) && !this.dbClient) {
                    break;
                }

                const { error } = await operation(
                    this.dbClient,
                    this.#authUserId,
                    JSON.parse(payload),
                );
                if (!error) {
                    this.dequeue(key);
                    continue;
                }

                item.lastError = error;
                item.lastAttemptAt = new Date().toISOString();

                const errorKind = classifySyncError(error);
                if (errorKind === "pre_session") {
                    this.#persistRecordBook();
                    break;
                }

                if (errorKind === "retryable") {
                    this.#persistRecordBook();
                    continue;
                }

                this.#persistRecordBook();
            }
        } finally {
            this.#active = false;
            if (this.#hasAuthBlockedItems()) {
                this.#clearRetryTimer();
            } else {
                this.#scheduleRetry();
            }
        }
    }
}

const SCHEMA_NAME = "exp_ccg_01";

export const syncOperations: Record<string, SyncOperation> = {
    registerParticipant: async (client, authUserId, payload) => {
        debug("registerParticipant", client, authUserId, payload);
        return Promise.resolve({ error: null });
    },
    updateParticipant: async (client, authUserId, payload) => {
        debug("updateParticipant", client, authUserId, payload);
        if (!client) return Promise.resolve({ error: "No database client" });
        if (!authUserId) return Promise.resolve({ error: "No authentication user ID" });
        const { error } = await client!
            .schema(SCHEMA_NAME)
            .from("participants")
            .update(payload as Record<string, never>)
            .eq("auth_user_id", authUserId);
        if (error) {
            return Promise.resolve({ error: error.message });
        }
        return Promise.resolve({ error: null });
    },
    submitComprehensionResponses: async (client, authUserId, payload) => {
        debug("submitComprehensionResponses", client, authUserId, payload);
        return Promise.resolve({ error: null });
    },
    submitGameRounds: async (client, authUserId, payload) => {
        debug("submitGameRounds", client, authUserId, payload);
        return Promise.resolve({ error: null });
    },
    submitSurveyResponses: async (client, authUserId, payload) => {
        debug("submitSurveyResponses", client, authUserId, payload);
        return Promise.resolve({ error: null });
    },
};
