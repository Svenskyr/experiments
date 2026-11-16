import type {
    InstrumentConfig,
    InstrumentModel,
    Status,
} from "#lib/common/Instrument/v1/Instrument.ts";
import { resolveDisplayOrder } from "#lib/common/Randomization/v1/Randomization.ts";

export const MCQ_KIND = "mcq";
export const MAX_USER_ITEMS = 20;
export const MAX_USER_ITEM_LENGTH = 200;

/* Authored shape (questions.ts) */

export interface McqSourceItem {
    itemId: string;
    itemText: string; // HTML; sanitized by the component
    isTrue?: boolean | undefined; // undefined: the item has no truth value
    displayOrder?: number | undefined; // See resolveDisplayOrder
}

export interface McqSource {
    id: string;
    questionText: string; // HTML; sanitized by the component
    items: McqSourceItem[];
    inputType: "radio" | "checkbox";
    completion: McqCompletion;
    showFeedback?: boolean | undefined;
    allowReset?: boolean | undefined;
    allowUserItems?: boolean | undefined;
}

/* Instrument shapes */

/** any: an item is selected. correct: every true item is selected and no false item is. */
export type McqCompletion = "any" | "correct";

export interface McqItem {
    itemId: string;
    itemText: string;
}

export interface McqPublic {
    questionText: string;
    items: McqItem[]; // In display order
    inputType: "radio" | "checkbox";
    completion: McqCompletion;
    showFeedback?: boolean | undefined;
    allowReset?: boolean | undefined;
    allowUserItems?: boolean | undefined;
}

export interface McqKey {
    itemTruth: Record<string, boolean>; // Items not listed have no truth value
}

export interface McqResponse {
    selectedItemIds: string[];
    attemptedItemIds: string[]; // Every item selected at any time since the last reset
    userItems: McqItem[]; // Item text is plain text, not HTML
}

export interface McqGrade {
    itemTruth: Record<string, boolean>; // Attempted items only
    allTrueSelected: boolean;
    gradedSelection: string[]; // Sorted selection this grade was computed for
}

/** `required`: once complete, the status cannot fall. `grade`: the grade currently shown. */
export interface McqCommandContext {
    required?: boolean | undefined;
    grade?: McqGrade | undefined;
}

/* Factory */

/** Build the instrument config in `load`. `randSeed` fixes the display order per participant. */
export function buildMcq(
    source: McqSource,
    randSeed?: string | number,
): InstrumentConfig<McqPublic, McqKey> {
    const itemTruth: Record<string, boolean> = {};
    for (const item of source.items) {
        if (item.isTrue !== undefined) itemTruth[item.itemId] = item.isTrue;
    }
    const hasKey = Object.keys(itemTruth).length > 0;
    if (source.completion === "correct" && !Object.values(itemTruth).includes(true)) {
        throw new Error(`MCQ ${source.id}: completion "correct" needs an item with isTrue: true`);
    }
    return {
        id: source.id,
        kind: MCQ_KIND,
        public: {
            questionText: source.questionText,
            items: resolveDisplayOrder(source.items, randSeed).map((item) => ({
                itemId: item.itemId,
                itemText: item.itemText,
            })),
            inputType: source.inputType,
            completion: source.completion,
            showFeedback: source.showFeedback,
            allowReset: source.allowReset,
            allowUserItems: source.allowUserItems,
        },
        key: hasKey ? { itemTruth } : undefined,
    };
}

/* Model */

export function emptyResponse(_pub?: McqPublic): McqResponse {
    return { selectedItemIds: [], attemptedItemIds: [], userItems: [] };
}

export function parseResponse(pub: McqPublic, raw: unknown): McqResponse | null {
    if (typeof raw !== "object" || raw === null) return null;
    const fields = raw as Record<string, unknown>;

    const canonicalIds = new Set(pub.items.map((item) => item.itemId));
    const texts = new Set(pub.items.map((item) => item.itemText));

    const userItems: McqItem[] = [];
    if (!Array.isArray(fields.userItems)) return null;
    if (fields.userItems.length > (pub.allowUserItems ? MAX_USER_ITEMS : 0)) return null;
    const knownIds = new Set(canonicalIds);
    for (const rawItem of fields.userItems as unknown[]) {
        if (typeof rawItem !== "object" || rawItem === null) return null;
        const { itemId, itemText } = rawItem as Record<string, unknown>;
        if (typeof itemId !== "string" || typeof itemText !== "string") return null;
        if (itemId.length === 0 || itemText.length > MAX_USER_ITEM_LENGTH) return null;
        if (userItemId(itemText) !== itemId || itemText !== itemText.trim()) return null;
        if (knownIds.has(itemId) || texts.has(itemText)) return null;
        knownIds.add(itemId);
        texts.add(itemText);
        userItems.push({ itemId, itemText });
    }

    const selectedItemIds = parseIdList(fields.selectedItemIds, knownIds);
    const attemptedItemIds = parseIdList(fields.attemptedItemIds, knownIds);
    if (!selectedItemIds || !attemptedItemIds) return null;
    if (pub.inputType === "radio" && selectedItemIds.length > 1) return null;
    if (!selectedItemIds.every((itemId) => attemptedItemIds.includes(itemId))) return null;

    return { selectedItemIds, attemptedItemIds, userItems };
}

export function status(pub: McqPublic, response: McqResponse, grade?: McqGrade): Status {
    if (
        response.selectedItemIds.length === 0
        && response.attemptedItemIds.length === 0
        && response.userItems.length === 0
    ) {
        return "empty";
    }
    if (pub.completion === "any") {
        return response.selectedItemIds.length > 0 ? "complete" : "partial";
    }
    // A grade computed for an earlier selection says nothing about this one.
    const isCorrect = grade !== undefined
        && sameIds(grade.gradedSelection, response.selectedItemIds)
        && grade.allTrueSelected
        && response.selectedItemIds.every((itemId) => grade.itemTruth[itemId] !== false);
    return isCorrect ? "complete" : "partial";
}

export function grade(_pub: McqPublic, key: McqKey, response: McqResponse): McqGrade {
    const itemTruth: Record<string, boolean> = {};
    for (const itemId of response.attemptedItemIds) {
        const truth = key.itemTruth[itemId];
        if (truth !== undefined) itemTruth[itemId] = truth;
    }
    return {
        itemTruth,
        allTrueSelected: Object.entries(key.itemTruth).every(([itemId, truth]) =>
            !truth || response.selectedItemIds.includes(itemId)
        ),
        gradedSelection: [...response.selectedItemIds].sort(),
    };
}

export const model: InstrumentModel<McqPublic, McqKey, McqResponse, McqGrade> = {
    kind: MCQ_KIND,
    emptyResponse,
    parseResponse,
    status,
    grade,
};

/* Queries */

export function allItems(pub: McqPublic, response: McqResponse): McqItem[] {
    return [...pub.items, ...response.userItems];
}

export function isUserItem(response: McqResponse, itemId: string): boolean {
    return response.userItems.some((item) => item.itemId === itemId);
}

/** The ID a user item with this text gets, or "" if the text yields none. */
export function userItemId(itemText: string): string {
    const slug = itemText.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
    return slug.length > 0 ? `user-${slug}` : "";
}

/** Whether `addUserItem` would add this text. */
export function canAddUserItem(pub: McqPublic, response: McqResponse, itemText: string): boolean {
    if (!pub.allowUserItems || response.userItems.length >= MAX_USER_ITEMS) return false;
    const text = itemText.trim();
    if (text.length === 0 || text.length > MAX_USER_ITEM_LENGTH) return false;
    const itemId = userItemId(text);
    if (itemId.length === 0) return false;
    return !allItems(pub, response).some((item) => item.itemId === itemId || item.itemText === text);
}

/* Commands. Each is a no-op if it would lower a required, complete response's status. */

export function selectItem(
    pub: McqPublic,
    response: McqResponse,
    itemId: string,
    isSelected: boolean,
    context?: McqCommandContext,
): void {
    if (!allItems(pub, response).some((item) => item.itemId === itemId)) return;
    keepComplete(pub, response, context, () => setSelected(pub, response, itemId, isSelected));
}

export function addUserItem(
    pub: McqPublic,
    response: McqResponse,
    itemText: string,
    context?: McqCommandContext,
): void {
    if (!canAddUserItem(pub, response, itemText)) return;
    const text = itemText.trim();
    const itemId = userItemId(text);
    keepComplete(pub, response, context, () => {
        response.userItems = [...response.userItems, { itemId, itemText: text }];
        setSelected(pub, response, itemId, true);
    });
}

export function deleteUserItem(
    pub: McqPublic,
    response: McqResponse,
    itemId: string,
    context?: McqCommandContext,
): void {
    if (!isUserItem(response, itemId)) return;
    keepComplete(pub, response, context, () => {
        response.userItems = response.userItems.filter((item) => item.itemId !== itemId);
        response.selectedItemIds = response.selectedItemIds.filter((id) => id !== itemId);
        response.attemptedItemIds = response.attemptedItemIds.filter((id) => id !== itemId);
    });
}

/** Clear the selection and the attempt history. User items stay. */
export function resetResponse(
    pub: McqPublic,
    response: McqResponse,
    context?: McqCommandContext,
): void {
    keepComplete(pub, response, context, () => {
        response.selectedItemIds = [];
        response.attemptedItemIds = [];
    });
}

/* Internal */

function setSelected(
    pub: McqPublic,
    response: McqResponse,
    itemId: string,
    isSelected: boolean,
): void {
    if (!isSelected) {
        response.selectedItemIds = response.selectedItemIds.filter((id) => id !== itemId);
        return;
    }
    if (pub.inputType === "radio") {
        response.selectedItemIds = [itemId];
    } else if (!response.selectedItemIds.includes(itemId)) {
        response.selectedItemIds = [...response.selectedItemIds, itemId];
    }
    if (!response.attemptedItemIds.includes(itemId)) {
        response.attemptedItemIds = [...response.attemptedItemIds, itemId];
    }
}

function keepComplete(
    pub: McqPublic,
    response: McqResponse,
    context: McqCommandContext | undefined,
    mutate: () => void,
): void {
    const mustStayComplete = context?.required === true
        && status(pub, response, context.grade) === "complete";
    if (!mustStayComplete) {
        mutate();
        return;
    }
    // "correct" cannot be checked without a new grade, so a complete response is locked.
    if (pub.completion === "correct") return;
    const before = {
        selectedItemIds: response.selectedItemIds,
        attemptedItemIds: response.attemptedItemIds,
        userItems: response.userItems,
    };
    mutate();
    if (status(pub, response) !== "complete") {
        response.selectedItemIds = before.selectedItemIds;
        response.attemptedItemIds = before.attemptedItemIds;
        response.userItems = before.userItems;
    }
}

function parseIdList(raw: unknown, knownIds: Set<string>): string[] | null {
    if (!Array.isArray(raw)) return null;
    const ids: string[] = [];
    for (const id of raw as unknown[]) {
        if (typeof id !== "string" || !knownIds.has(id) || ids.includes(id)) return null;
        ids.push(id);
    }
    return ids;
}

function sameIds(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((id) => b.includes(id));
}
