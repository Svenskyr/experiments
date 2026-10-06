import type { ClozeBlankResponse } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import {
    blankHasCorrectMarker,
    type ClozeQuestionIR,
    getBlanksFromLine,
    isBlankCorrect,
    wasSelectedIdsFromMcqItems,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import type { MultipleChoiceItem } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    type SyncHandler,
} from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
import {
    noPayloadError,
    notReadyError,
    type PostgrestError,
} from "../_syncHandler/v3/SyncHandlerActions.ts";
import type { ClozeLinePayload, ClozeLineResult } from "./ClozeComprehensionRegistry.ts";

export interface ClozeFieldsetStorage {
    fieldsetQid: string;
    lines: Record<number, Record<string, ClozeBlankResponse>>;
    serverGraded?: Record<number, MultipleChoiceItem[][]>;
    /** Blank ids included in the last server check (values = correctness at check time). */
    lastBlankCorrect?: Record<string, boolean>;
    /** Blank ids from the last local check; correctness is derived from question IR on restore. */
    lastCheckedBlankIds?: string[];
}

const storageKeyPrefix = "exp_ccg_01:cloze:";
export const clozeFieldsetStorageKey = (fieldsetQid: string) => `${storageKeyPrefix}${fieldsetQid}`;

export function load(fieldsetQid: string): ClozeFieldsetStorage | null {
    return loadFromLocalStorage<ClozeFieldsetStorage>(clozeFieldsetStorageKey(fieldsetQid))
        ?? null;
}

export function save(payload: ClozeFieldsetStorage): void {
    saveToLocalStorage(clozeFieldsetStorageKey(payload.fieldsetQid), payload);
}

export function saveBlankResponse(
    fieldsetQid: string,
    lineIndex: number,
    blankId: string,
    response: ClozeBlankResponse,
): void {
    const existing = load(fieldsetQid) ?? { fieldsetQid, lines: {} };
    const lineBlanks = { ...(existing.lines[lineIndex] ?? {}), [blankId]: response };
    const lastBlankCorrect = { ...(existing.lastBlankCorrect ?? {}) };
    delete lastBlankCorrect[blankId];
    const lastCheckedBlankIds = existing.lastCheckedBlankIds?.filter((id) => id !== blankId);
    save({
        ...existing,
        fieldsetQid,
        lines: { ...existing.lines, [lineIndex]: lineBlanks },
        lastBlankCorrect: Object.keys(lastBlankCorrect).length > 0 ? lastBlankCorrect : undefined,
        lastCheckedBlankIds: lastCheckedBlankIds && lastCheckedBlankIds.length > 0
            ? lastCheckedBlankIds
            : undefined,
    });
}

export function flattenResponses(
    storage: ClozeFieldsetStorage,
): Record<string, ClozeBlankResponse> {
    const flat: Record<string, ClozeBlankResponse> = {};
    for (const lineBlanks of Object.values(storage.lines)) {
        Object.assign(flat, lineBlanks);
    }
    return flat;
}

/** In-progress blanks keep only the current choice; attempt history applies after a check. */
export function draftResponsesFromStorage(
    storage: ClozeFieldsetStorage,
    checkedBlankIds: readonly string[],
): Record<string, ClozeBlankResponse> {
    const flat = flattenResponses(storage);
    const checked = new Set(checkedBlankIds);
    for (const [blankId, response] of Object.entries(flat)) {
        if (checked.has(blankId)) {
            continue;
        }
        flat[blankId] = {
            selectedItemId: response.selectedItemId,
            freeText: response.freeText,
        };
    }
    return flat;
}

/** Graded blank snapshots for restoring check styling after navigation. */
export function gradedResponsesFromStorage(
    question: ClozeQuestionIR,
    storage: ClozeFieldsetStorage,
): Record<string, ClozeBlankResponse> | null {
    const flat = flattenResponses(storage);
    let blankCorrect = storage.lastBlankCorrect;

    if (!blankCorrect && storage.serverGraded) {
        blankCorrect = {};
        for (let lineIndex = 0; lineIndex < question.lines.length; lineIndex++) {
            if (storage.serverGraded[lineIndex] === undefined) {
                continue;
            }
            const line = question.lines[lineIndex]!;
            for (const blank of getBlanksFromLine(line).filter(blankHasCorrectMarker)) {
                const response = flat[blank.blankId] ?? { selectedItemId: "", freeText: "" };
                blankCorrect[blank.blankId] = isBlankCorrect(blank, response);
            }
        }
        if (Object.keys(blankCorrect).length === 0) {
            blankCorrect = undefined;
        }
    }

    if (!blankCorrect || Object.keys(blankCorrect).length === 0) {
        return null;
    }

    const snapshot: Record<string, ClozeBlankResponse> = {};
    for (const blankId of Object.keys(blankCorrect)) {
        const response = flat[blankId];
        if (response) {
            snapshot[blankId] = { ...response };
        }
    }
    return Object.keys(snapshot).length > 0 ? snapshot : null;
}

/** Graded blank snapshots after local check (no correctness booleans in storage). */
export function gradedResponsesFromLocalCheckStorage(
    storage: ClozeFieldsetStorage,
): Record<string, ClozeBlankResponse> | null {
    const blankIds = storage.lastCheckedBlankIds;
    if (!blankIds || blankIds.length === 0) {
        return null;
    }
    const flat = flattenResponses(storage);
    const snapshot: Record<string, ClozeBlankResponse> = {};
    for (const blankId of blankIds) {
        const response = flat[blankId];
        if (response) {
            snapshot[blankId] = { ...response };
        }
    }
    return Object.keys(snapshot).length > 0 ? snapshot : null;
}

export function saveLinesPayload(
    fieldsetQid: string,
    linesPayload: ClozeLinePayload[],
    options?: { lastCheckedBlankIds?: string[] },
): void {
    const existing = load(fieldsetQid) ?? { fieldsetQid, lines: {} };
    const lines = { ...existing.lines };
    for (const line of linesPayload) {
        lines[line.lineIndex] = { ...(lines[line.lineIndex] ?? {}), ...line.blanks };
    }
    const lastCheckedBlankIds = options?.lastCheckedBlankIds
        ? [...options.lastCheckedBlankIds]
        : existing.lastCheckedBlankIds;
    save({
        ...existing,
        fieldsetQid,
        lines,
        lastCheckedBlankIds: lastCheckedBlankIds && lastCheckedBlankIds.length > 0
            ? lastCheckedBlankIds
            : undefined,
    });
}

export function mergeServerResult(
    fieldsetQid: string,
    serverLines: ClozeLineResult[],
    options?: { persistGradingInStorage?: boolean },
): ClozeFieldsetStorage {
    const persistGrading = options?.persistGradingInStorage ?? true;
    const existing = load(fieldsetQid) ?? { fieldsetQid, lines: {} };
    const serverGraded = persistGrading
        ? { ...(existing.serverGraded ?? {}) }
        : existing.serverGraded;
    const lastBlankCorrect = persistGrading
        ? { ...(existing.lastBlankCorrect ?? {}) }
        : existing.lastBlankCorrect;
    const lines = { ...existing.lines };

    for (const line of serverLines) {
        if (persistGrading) {
            Object.assign(lastBlankCorrect!, line.blankCorrect);
            serverGraded![line.lineIndex] = line.responses;
        }
        const lineBlanks = { ...(lines[line.lineIndex] ?? {}) };
        for (let i = 0; i < line.blankIds.length; i++) {
            const blankId = line.blankIds[i]!;
            const items = line.responses[i];
            if (!items) {
                continue;
            }
            const prev = lineBlanks[blankId] ?? { selectedItemId: "", freeText: "" };
            lineBlanks[blankId] = {
                ...prev,
                wasSelectedItemIds: wasSelectedIdsFromMcqItems(items),
            };
        }
        lines[line.lineIndex] = lineBlanks;
    }

    const merged: ClozeFieldsetStorage = {
        ...existing,
        fieldsetQid,
        lines,
        serverGraded,
        lastBlankCorrect:
            persistGrading && lastBlankCorrect && Object.keys(lastBlankCorrect).length > 0
                ? lastBlankCorrect
                : existing.lastBlankCorrect,
    };
    save(merged);
    return merged;
}

export function sync(syncHandler: SyncHandler, fieldsetQid: string): void {
    syncHandler.enqueue(clozeFieldsetStorageKey(fieldsetQid), "submitClozeComprehensionQuestion");
}

export async function submitCheck(
    fieldsetQid: string,
    linesPayload: ClozeLinePayload[],
    options?: { persistGradingInStorage?: boolean },
): Promise<{ data: { lines: ClozeLineResult[] } | null; error: PostgrestError | null }> {
    saveLinesPayload(fieldsetQid, linesPayload);

    let response: Response;
    try {
        response = await fetch("/exp/ccg-01/api/comprehension/cloze", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fieldsetQid, lines: linesPayload }),
        });
    } catch (err) {
        return {
            data: null,
            error: {
                message: err instanceof Error ? err.message : "Network error",
                details: "",
                hint: "",
                code: "500",
            },
        };
    }

    let body: Record<string, unknown>;
    try {
        body = await response.json();
    } catch {
        return {
            data: null,
            error: {
                message: `HTTP ${response.status}`,
                details: "",
                hint: "",
                code: String(response.status),
            },
        };
    }

    if (!response.ok) {
        return {
            data: null,
            error: {
                message: typeof body.error === "string" ? body.error : `HTTP ${response.status}`,
                details: typeof body.details === "string" ? body.details : "",
                hint: typeof body.hint === "string" ? body.hint : "",
                code: typeof body.code === "string" ? body.code : String(response.status),
            },
        };
    }

    const data = body.data as { lines: ClozeLineResult[] };
    mergeServerResult(fieldsetQid, data.lines, options);
    return { data, error: null };
}

export async function submit(
    syncHandler: SyncHandler,
    storageKeyArg: string,
): Promise<{ data: unknown; error: PostgrestError | null }> {
    if (!syncHandler.ready || !syncHandler.db) {
        return { data: null, error: notReadyError() };
    }

    const payload = loadFromLocalStorage<ClozeFieldsetStorage>(storageKeyArg);
    if (!payload) {
        return { data: null, error: noPayloadError(storageKeyArg) };
    }

    const linesPayload: ClozeLinePayload[] = Object.entries(payload.lines).map(
        ([lineIndex, blanks]) => ({
            lineIndex: Number(lineIndex),
            blanks,
        }),
    );

    if (linesPayload.length === 0) {
        return { data: null, error: noPayloadError(storageKeyArg) };
    }

    return submitCheck(payload.fieldsetQid, linesPayload);
}
