import debugLib from "debug";
const debug = debugLib("ccg-01:PageTimeTracker.ts");
import { browser } from "$app/environment";

export interface PageTimeRecord {
    timesMs: Record<string, number>;
    activePage: string | null;
    activeSince: number | null;
    lastSyncedAt: string | null;
}

export function newPageTimeRecord(): PageTimeRecord {
    return {
        timesMs: {},
        activePage: null,
        activeSince: null,
        lastSyncedAt: null,
    };
}

export function loadPageTimeRecord(key: string): PageTimeRecord {
    const stored = browser ? localStorage.getItem(key) : null;
    const pageTimeRecord = stored ? JSON.parse(stored) as PageTimeRecord : newPageTimeRecord();
    return pageTimeRecord;
}

export function flushActivePage(
    key: string,
    record: PageTimeRecord,
    newPageName: string,
): PageTimeRecord {
    if (!browser) return record;
    if (!record.activePage || !record.activeSince) return startActivePage(key, record, newPageName);
    debug(`Flushing active page ${record.activePage} 🠖 ${newPageName}`);
    const elapsedMs = Date.now() - record.activeSince;
    record.timesMs[record.activePage] = (record.timesMs[record.activePage] ?? 0) + elapsedMs;
    record.activePage = newPageName;
    record.activeSince = Date.now();
    localStorage.setItem(key, JSON.stringify(record));
    return record;
}

export function startActivePage(
    key: string,
    record: PageTimeRecord,
    newPageName: string,
): PageTimeRecord {
    if (!browser) return record;
    record.activePage = newPageName;
    record.activeSince = Date.now();
    localStorage.setItem(key, JSON.stringify(record));
    return record;
}
