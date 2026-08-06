export interface MultipleChoiceQuestion {
    qid: string; // Identifies the question
    questionText: string; // This is the fieldset's legend text
    canonicalItems: MultipleChoiceItem[]; // Array of canonical response items
    userItems?: MultipleChoiceItem[] | undefined; // Array of user-provided response items
    inputType: "radio" | "checkbox"; // Having one component with inputType options prevents Svelte's two-way binding (since inputType must be known at the component's compile time), but we can use onchange instead.
    required?: "none" | "any" | "all" | undefined; // none: the question is always complete; responding is optional. any: the question is complete if any response item is currently selected. all: the question is complete if all "true" response items are currently selected && no "false" response items are currently selected. If "all", then feedback colors will be shown.
    randSeed?: string | undefined; // Seed for randomization of display order; allows deterministic randomization.
    showFeedback?: boolean | undefined;
    allowReset?: boolean | undefined; // If true, then the component includes a button to reset the question state.
    allowUserItems?: boolean | undefined; // If true, then the user can add additional response items.
}

export interface MultipleChoiceItem {
    itemId: string; // Identifies the item within the question.
    itemText: string; // Text that the user sees (or enters if it's user-provided)
    isTrue?: boolean | null | undefined; // Whether the item is canonically correct or incorrect (e.g., "2 + 2...: a) 4, b) 5"). If undefined or null, then it doesn't have a truth state (e.g., which of these colors do you prefer? a) red, b) blue).
    displayOrder?: number | undefined; // Ordering hint provided as a prop. If undefined, then randomized with other undefined items.
    isSelected?: boolean | undefined; // The item is currently selected ("checked" in HTML).
    wasSelected?: boolean | undefined; // The item was ever selected (used for tracking incorrect selections).
}

export function MultipleChoiceQuestion(data: MultipleChoiceQuestion): MultipleChoiceQuestion {
    // return newMultipleChoiceQuestion(data, undefined);
    // data.canonicalItems = resolveDisplayOrder(data.canonicalItems, data.randSeed);
    return data;
}

export function newMultipleChoiceQuestion(
    canonicalData: MultipleChoiceQuestion,
    storedData?: { canonicalItems: MultipleChoiceItem[]; userItems?: MultipleChoiceItem[] },
): MultipleChoiceQuestion {
    let canonicalItems: MultipleChoiceItem[] = resolveDisplayOrder(
        [...canonicalData.canonicalItems],
        canonicalData.randSeed,
    );

    if (storedData) {
        const storedMap = new Map(storedData.canonicalItems.map((item) => [item.itemId, item]));
        canonicalItems = canonicalItems.map((item) => {
            const storedItem = storedMap.get(item.itemId);
            return {
                ...item,
                isSelected: storedItem?.isSelected ?? item.isSelected,
                wasSelected: storedItem?.wasSelected ?? item.wasSelected,
                displayOrder: storedItem?.displayOrder ?? item.displayOrder,
            };
        });
    }

    const question: MultipleChoiceQuestion = {
        ...canonicalData,
        canonicalItems,
        userItems: canonicalData.allowUserItems ? (storedData?.userItems ?? []) : undefined,
    };
    return question;
}

export function mergeQuestionData(
    question: MultipleChoiceQuestion,
    storedData?: { canonicalItems: MultipleChoiceItem[]; userItems?: MultipleChoiceItem[] },
): MultipleChoiceQuestion {
    if (storedData) {
        if (storedData.canonicalItems) {
            const storedMap = new Map(storedData.canonicalItems.map((item) => [item.itemId, item]));
            for (const item of question.canonicalItems) {
                const storedItem = storedMap.get(item.itemId);
                item.isSelected = storedItem?.isSelected ?? item.isSelected;
                item.wasSelected = storedItem?.wasSelected ?? item.wasSelected;
                item.displayOrder = storedItem?.displayOrder ?? item.displayOrder;
            }
        }
        if (question.allowUserItems && storedData.userItems) {
            question.userItems = [...storedData.userItems];
        }
    }
    return question;
}

export function areAllTrueItemsSelected(question: MultipleChoiceQuestion): boolean {
    const trueItems = question.canonicalItems.filter((item) => item.isTrue === true);
    return trueItems.every((item) => item.isSelected === true);
}

export function areAllSelectedItemsTrue(question: MultipleChoiceQuestion): boolean {
    const selectedItems = question.canonicalItems.filter((item) => item.isSelected === true);
    return selectedItems.every((item) => item.isTrue === true);
}

export function isQuestionComplete(question: MultipleChoiceQuestion): boolean {
    switch (question.required) {
        case "all": {
            return areAllTrueItemsSelected(question) && areAllSelectedItemsTrue(question);
        }
        case "any":
            const anyItems = [...question.canonicalItems, ...question.userItems ?? []];
            return anyItems.some((item) => item.isSelected);
        case "none":
        default:
            return true;
    }
}

export function selectItem(
    question: MultipleChoiceQuestion,
    itemId: string,
    isSelected: boolean,
): void {
    const items = [...question.canonicalItems, ...question.userItems ?? []];
    const item = items.find((item) => item.itemId === itemId);
    if (!item) return;

    if (isSelected && question.inputType === "radio") {
        for (const item of items) {
            item.isSelected = false;
        }
    }

    item.isSelected = isSelected;
    item.wasSelected ||= isSelected;
    return;
}

export function addUserItem(question: MultipleChoiceQuestion, itemText: string): void {
    if (!question.allowUserItems) return;
    const itemId = normalizeItemId(`user-${itemText}`);
    if (itemId.length === 0) return;
    const items = [...question.canonicalItems, ...question.userItems ?? []];
    if (items.some((item) => item.itemId === itemId)) return;

    const newItem: MultipleChoiceItem = {
        itemId,
        itemText,
        displayOrder: items.length + 1,
    };

    question.userItems = [...question.userItems ?? [], newItem];
    selectItem(question, itemId, true);
    return;
}

export function deleteUserItem(question: MultipleChoiceQuestion, itemId: string): void {
    if (!question.allowUserItems) return;
    question.userItems = (question.userItems ?? []).filter((item) => item.itemId !== itemId);
    return;
}

export function resetQuestion(question: MultipleChoiceQuestion): void {
    const items = [...question.canonicalItems, ...question.userItems ?? []];
    for (const item of items) {
        item.isSelected = false;
        item.wasSelected = false;
    }
    return;
}

import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";

export function resolveDisplayOrder(
    items: MultipleChoiceItem[],
    randSeed?: string | number,
): MultipleChoiceItem[] {
    const resolvedItems = items.map((item) => ({ ...item }));
    let positiveDisplayIndices: MultipleChoiceItem[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder >= 0
    );

    positiveDisplayIndices = shuffleSameDisplayIndexGroups(
        positiveDisplayIndices,
        randSeed,
    );
    let negativeDisplayIndices: MultipleChoiceItem[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder < 0
    );

    negativeDisplayIndices = shuffleSameDisplayIndexGroups(
        negativeDisplayIndices,
        randSeed,
    );
    let undefinedDisplayIndices: MultipleChoiceItem[] = resolvedItems.filter((item) =>
        item.displayOrder === undefined
    );

    undefinedDisplayIndices = FisherYatesShuffle(undefinedDisplayIndices, randSeed);

    const randomizedItems: MultipleChoiceItem[] = [
        ...positiveDisplayIndices,
        ...undefinedDisplayIndices,
        ...negativeDisplayIndices,
    ];
    randomizedItems.forEach((item, index) => {
        item.displayOrder = index + 1;
    });
    return randomizedItems;
}

function shuffleSameDisplayIndexGroups(
    items: MultipleChoiceItem[],
    randSeed?: string | number,
): MultipleChoiceItem[] {
    const groups = new Map<number, MultipleChoiceItem[]>();
    for (const item of items) {
        const displayOrder = item.displayOrder!;
        const group = groups.get(displayOrder) ?? [];
        group.push(item);
        groups.set(displayOrder, group);
    }

    const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
    return sortedKeys.flatMap((displayIndex) =>
        FisherYatesShuffle(
            groups.get(displayIndex)!,
            randSeed !== undefined ? `${randSeed}:${displayIndex}` : undefined,
        )
    );
}

function normalizeItemId(itemText: string): string {
    return itemText.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}

import { browser } from "$app/environment";
import DOMPurify from "dompurify";

export function clientsideSanitize(text: string): string {
    if (!browser) return text;
    return DOMPurify.sanitize(text);
}
