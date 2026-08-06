export const PRE_SESSION_SYNC_ERROR = "__PRE_SESSION_SYNC__";

export type SyncErrorKind = "pre_session" | "retryable" | "non_retryable";

const LOCAL_ONLY_OPERATIONS = new Set(["localStorage", "sessionStorage"]);

export function requiresAuth(operationId: string | undefined): boolean {
    if (!operationId) return false;
    return !LOCAL_ONLY_OPERATIONS.has(operationId);
}

const RETRYABLE_PATTERNS = [
    /failed to fetch/i,
    /network/i,
    /timeout/i,
    /econnreset/i,
    /502\b/,
    /503\b/,
    /504\b/,
    /429\b/,
    /too many requests/i,
    /service unavailable/i,
    /gateway timeout/i,
];

export function classifySyncError(error: string): SyncErrorKind {
    if (error === PRE_SESSION_SYNC_ERROR) return "pre_session";
    if (RETRYABLE_PATTERNS.some((pattern) => pattern.test(error))) {
        return "retryable";
    }
    return "non_retryable";
}

export interface SyncRecordEntry {
    syncedAt: string | null; // ISO string; null = unsynced
    lastAttemptAt: string | null; // ISO string; null = never attempted
    lastError: string | null; // null = no error
    operationId: string | undefined; // undefined = no extra operations; only local storage
}

export interface SyncRecordBook {
    [key: string]: SyncRecordEntry;
}

export function parseRecordEntry(raw: unknown): SyncRecordEntry {
    const entry = raw as Partial<SyncRecordEntry>;
    return {
        syncedAt: entry.syncedAt ?? null,
        lastAttemptAt: entry.lastAttemptAt ?? null,
        lastError: entry.lastError ?? null,
        operationId: entry.operationId,
    };
}

export function parseRecordBook(raw: string): SyncRecordBook {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const book: SyncRecordBook = {};
    for (const [key, value] of Object.entries(parsed)) {
        book[key] = parseRecordEntry(value);
    }
    return book;
}
