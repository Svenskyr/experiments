/* Client record module (style guide Part 5 §2): localStorage drafts, keyed by instrument ID.
DRAFT: nothing is sent to a server yet. When the commit endpoint exists, the page's `oncommit`
also enqueues the instrument ID on the SyncHandler. */

import { STORAGE_PREFIX } from "#exp/dg-01/experiment.ts";

function storageKey(instrumentId: string): string {
    return `${STORAGE_PREFIX}response:${instrumentId}`;
}

/** Read a draft. `parse` is the instrument's `parseResponse`; a draft it rejects is ignored. */
export function loadDraft<R>(instrumentId: string, parse: (raw: unknown) => R | null): R | null {
    const stored = localStorage.getItem(storageKey(instrumentId));
    if (stored === null) return null;
    try {
        return parse(JSON.parse(stored));
    } catch {
        return null;
    }
}

export function saveDraft(instrumentId: string, response: unknown): void {
    localStorage.setItem(storageKey(instrumentId), JSON.stringify(response));
}

export function clearExperimentLocalStorage(): void {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) {
        if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
}
