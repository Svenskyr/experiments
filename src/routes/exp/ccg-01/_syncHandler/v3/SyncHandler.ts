import { PUBLIC_ENV } from "$env/static/public";
import debugLib from "debug";
import { browser } from "$app/environment";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext } from "svelte";
export const [getSyncHandler, setSyncHandler] = createContext<SyncHandler>();

import { Actions } from "./SyncHandlerActions.ts";

export interface SyncQueueItem {
    attempts: number;
    lastAttemptAt: number | null;
    nextAttemptAt: number;
    actionId: string;
}

export class SyncHandler {
    readonly scope: string;
    readonly debug: ReturnType<typeof debugLib>;
    readonly #syncQueueKey: string;
    db: SupabaseClient | undefined;
    authUserId: string | undefined;
    sessionId: string | undefined;
    #syncQueue: Record<string, SyncQueueItem> = {};
    #queueIsRunning: boolean = false;

    constructor(scope: string, debug?: ReturnType<typeof debugLib>) {
        this.scope = scope;
        this.#syncQueueKey = `${this.scope}:sync-queue`;
        this.debug = debug ?? debugLib(`${this.scope}:SyncHandler`);
        this.rebuildQueue();
        this.startQueue();
    }

    get ready(): boolean {
        return !!this.db && !!this.authUserId;
    }

    async initDb(db: SupabaseClient, sessionId: string): Promise<string | null> {
        this.db = db;
        const { data: { session } } = await this.db.auth.getSession();
        this.authUserId = session?.user?.id ?? undefined;
        if (!this.authUserId) return "no authUserId";
        this.sessionId = sessionId;
        this.startQueue();
        this.debug("SyncHandler db connection established; ready to sync.");
        return null;
    }

    rebuildQueue(): void {
        const syncQueue = loadFromLocalStorage<Record<string, SyncQueueItem>>(this.#syncQueueKey);
        if (!syncQueue) return;
        this.#syncQueue = syncQueue;
    }

    enqueue(key: string, actionId: string): void {
        this.#syncQueue[key] = {
            attempts: 0,
            lastAttemptAt: null,
            nextAttemptAt: Date.now() - 1000,
            actionId,
        };
        saveToLocalStorage(this.#syncQueueKey, this.#syncQueue);
        this.startQueue();
    }

    startQueue(): void {
        if (!this.ready || this.#queueIsRunning) return;
        this.#queueIsRunning = true;
        (async () => {
            for (const key of Object.keys(this.#syncQueue)) {
                const item = this.#syncQueue[key];
                if (item.nextAttemptAt > Date.now()) continue;
                // execute the action
                // const { data, error } = await Actions[item.actionId as keyof typeof Actions](
                //     this,
                //     key,
                // );
                // if (error) {
                //     this.debug(`Error submitting ${item.actionId}`, error);
                //     item.attempts++;
                //     item.nextAttemptAt = nextAttemptAt(item.attempts, "exponential");
                //     saveToLocalStorage(`${this.#syncQueueKey}:${key}`, item);
                //     continue;
                // } else {
                //     this.debug(`${item.actionId} successful`, data);
                //     delete this.#syncQueue[key];
                //     saveToLocalStorage(this.#syncQueueKey, this.#syncQueue);
                //     continue;
                // }

                // Any db error here just crashes the syncHandler, so need try/catch
                try {
                    const { data, error } = await Actions[item.actionId as keyof typeof Actions](
                        this,
                        key,
                    );
                    if (error) {
                        console.error(`Error submitting ${item.actionId}`, error);
                        throw error;
                    }
                    this.debug(`${item.actionId} submitted successfully`, data);
                    delete this.#syncQueue[key];
                    saveToLocalStorage(this.#syncQueueKey, this.#syncQueue);
                } catch (error) {
                    this.debug(`Error submitting ${item.actionId}`, error);
                    item.attempts++;
                    item.nextAttemptAt = nextAttemptAt(item.attempts, "exponential");
                    saveToLocalStorage(this.#syncQueueKey, this.#syncQueue);
                }
            }
            this.#queueIsRunning = false;
            if (Object.keys(this.#syncQueue).length > 0) {
                setTimeout(() => {
                    this.startQueue();
                }, 5000);
            }
        })();
    }
}

export function saveToLocalStorage<T>(key: string, payload: T): void {
    if (!browser) return;
    localStorage.setItem(key, JSON.stringify(payload));
}

export function loadFromLocalStorage<T>(key: string): T | null {
    if (!browser) return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
}

// Attempts: Linear, Exponential
// 0: 0, 0 seconds
// 1: 5, 5 seconds
// 2: 10, 15 seconds
// 3: 15, 35 seconds
// 4: 20, 75 seconds

function nextAttemptAt(attempts: number, backoff: "linear" | "exponential"): number {
    if (backoff === "linear") {
        return Date.now() + attempts * 5000; // Wait (attempts * 5 seconds)
    } else if (backoff === "exponential") {
        return Date.now() + (Math.pow(2, attempts) - 1) * 5000;
    }
    throw new Error(`Invalid backoff mode: ${backoff}`);
}
