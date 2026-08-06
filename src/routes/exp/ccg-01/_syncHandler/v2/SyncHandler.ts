import debugLib from "debug";
const debug = debugLib("exp_ccg_01:SyncHandler");
import type { SupabaseClient } from "@supabase/supabase-js";

let syncHandler: SyncHandler | undefined;

const SCOPE = "exp_ccg_01";
const syncQueueKey = () => `${SCOPE}:sync-queue`;
const syncQueueItemKey = (key: string) => `${SCOPE}:sync-queue:${key}`;

export function setSyncHandler(db: SupabaseClient): SyncHandler {
    syncHandler = SyncHandler(SCOPE, db);
    return syncHandler;
}

export function getSyncHandler(): SyncHandler {
    syncHandler ??= SyncHandler(SCOPE, undefined);
    return syncHandler;
}

interface SyncRecordItem {
    actionId: string;
    attempts: number;
    lastAttemptAt: number | null;
}

export interface SyncRecord {
    [key: string]: SyncRecordItem;
}

export interface SyncHandler {
    scope: string;
    db: SupabaseClient | undefined;
    authUserId: string | undefined;
    queue: SyncRecord;
    active: boolean;
    enqueue: (key: string, object: unknown, actionId: string) => void;
    save: <T>(key: string, object: T) => void;
    load: <T>(key: string) => T | null;
    actions: Record<string, (key: string, object: unknown) => Promise<{ error: string | null }>>;
}

export function SyncHandler(
    scope: string,
    db: SupabaseClient | undefined,
): SyncHandler {
    const storedQueue = localStorage.getItem(syncQueueKey());
    const queue: SyncRecord = storedQueue ? JSON.parse(storedQueue) as SyncRecord : {};
    const syncHandler: SyncHandler = {
        scope,
        db,
        authUserId: undefined,
        queue: queue,
        active: false,
        enqueue: enqueue,
        save: save,
        load: load,
        actions: actions,
    };
    return syncHandler;
}

export async function initAuth(): Promise<void> {
    const syncHandler = getSyncHandler();
    if (!syncHandler?.db) return;
    const { data: { session } } = await syncHandler.db.auth.getSession();
    syncHandler.authUserId = session?.user?.id ?? undefined;
    syncHandler.db.auth.onAuthStateChange((_event, session) => {
        syncHandler!.authUserId = session?.user?.id ?? undefined;
    });
}

export function save<T>(key: string, object: T): void {
    localStorage.setItem(key, JSON.stringify(object));
}

export function load<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
}

export function enqueue(key: string, payload: string, actionId: string): void {
    const syncHandler = getSyncHandler();
    const syncRecordItem: SyncRecordItem = {
        actionId,
        attempts: 0,
        lastAttemptAt: null,
    };
    localStorage.setItem(syncQueueItemKey(key), payload);
    syncHandler.queue = { ...syncHandler.queue, [key]: syncRecordItem };
    localStorage.setItem(syncQueueKey(), JSON.stringify(syncHandler.queue));
    syncHandler.active = true;
    startQueue();
}

import { submitPageTimeRecord } from "../../_database/PageTimeTrackerDBM.ts";
export const actions = {
    syncPageTimeRecord: submitPageTimeRecord,
};

async function startQueue(): Promise<void> {
    if (!syncHandler || !syncHandler.active || !syncHandler.db || !syncHandler.authUserId) return;
    try {
        while (syncHandler.active) {
            const key = Object.keys(syncHandler.queue)[0];
            if (!key) break;
            const queueItem = syncHandler.queue[key];
            if (!queueItem) break;
            const action = syncHandler.actions[queueItem.actionId];
            if (!action) break;
            const payload = localStorage.getItem(syncQueueItemKey(key));
            if (!payload) break;
            const { error } = await action(key, payload);
            if (error) {
                console.error(error);
                queueItem.attempts++;
                queueItem.lastAttemptAt = Date.now();
                syncHandler.queue[key] = queueItem;
                localStorage.setItem(
                    syncQueueKey(),
                    JSON.stringify(syncHandler.queue),
                );
            } else {
                delete syncHandler.queue[key];
                localStorage.setItem(
                    syncQueueKey(),
                    JSON.stringify(syncHandler.queue),
                );
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        syncHandler.active = false;
    }
}
