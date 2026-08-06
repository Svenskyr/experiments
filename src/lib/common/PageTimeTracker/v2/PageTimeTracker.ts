import debugLib from "debug";
const debug = debugLib("PageTimeTracker");
import { browser } from "$app/environment";

export interface PageTimeRecord {
    timesMs: Record<string, number>;
    activePage: string | null;
    activeSince: number | null;
}

export function PageTimeRecord(): PageTimeRecord {
    return {
        timesMs: {},
        activePage: null,
        activeSince: null,
    };
}

export function flushActivePage(
    key: string,
    record: PageTimeRecord,
    newPageName: string,
): PageTimeRecord {
    if (!browser) return record;
    if (record.activePage === newPageName) return record;
    if (!record.activePage || !record.activeSince) return startActivePage(key, record, newPageName);
    // debug(`Flushing active page ${record.activePage} 🠖 ${newPageName}`);
    const elapsedMs = Date.now() - record.activeSince;
    record.timesMs[record.activePage] = (record.timesMs[record.activePage] ?? 0) + elapsedMs;
    record.activePage = newPageName;
    record.activeSince = Date.now();
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
    return record;
}
