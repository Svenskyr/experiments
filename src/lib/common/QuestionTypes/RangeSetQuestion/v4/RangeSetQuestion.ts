import type { Snippet } from "svelte";
import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";
import { browser } from "$app/environment";
import DOMPurify from "dompurify";

export interface RangeSetQuestion {
    qid: string;
    questionText: string | Snippet;
    min: number;
    max: number;
    step: number;
    tickInterval?: number | undefined;
    initialValue?: number | undefined;
    required?: "none" | "any" | "all" | undefined;
    randSeed?: string | undefined;
    allowUserItems?: boolean | undefined;
    rangeLabels?: string[] | undefined;
    canonicalItems: RangeSetItem[];
    userItems?: RangeSetItem[] | undefined;
}

export interface RangeSetItem {
    itemId: string;
    itemText: string | Snippet;
    value?: number | null | undefined;
    displayOrder?: number | undefined;
    tooltipText?: string | undefined;
}

export function newRangeSetQuestion(
    canonicalData: RangeSetQuestion,
    storedData?: { canonicalItems: RangeSetItem[]; userItems?: RangeSetItem[] },
): RangeSetQuestion {
    const question = {
        ...canonicalData,
        rangeLabels: canonicalData.rangeLabels ? [...canonicalData.rangeLabels] : undefined,
        canonicalItems: canonicalData.canonicalItems.map((item) => ({ ...item })),
    };

    if (storedData) {
        const storedMap = new Map(storedData.canonicalItems.map((item) => [item.itemId, item]));
        question.canonicalItems = question.canonicalItems.map((item) => {
            const storedItem = storedMap.get(item.itemId);
            return {
                ...item,
                value: storedItem?.value ?? item.value,
                displayOrder: storedItem?.displayOrder ?? item.displayOrder,
            };
        });
        if (question.allowUserItems && storedData.userItems) {
            question.userItems = storedData.userItems;
        }
    }
    return question;
}

// export function newRangeSetQuestion(
//     canonicalData: RangeSetQuestion,
//     storedData?: { canonicalItems: RangeSetItem[]; userItems?: RangeSetItem[] },
// ): RangeSetQuestion {
//     let canonicalItems: RangeSetItem[] = [...canonicalData.canonicalItems];

//     if (storedData) {
//         const storedMap = new Map(storedData.canonicalItems.map((item) => [item.itemId, item]));
//         canonicalItems = canonicalItems.map((item) => {
//             const storedItem = storedMap.get(item.itemId);
//             return {
//                 ...item,
//                 value: storedItem?.value ?? item.value,
//                 displayOrder: storedItem?.displayOrder ?? item.displayOrder,
//             };
//         });
//     }

//     return {
//         ...canonicalData,
//         initialValue: canonicalData.initialValue ?? canonicalData.min,
//         canonicalItems,
//         userItems: canonicalData.allowUserItems ? (storedData?.userItems ?? []) : undefined,
//     };
// }

// export function mergeQuestionData(
//     question: RangeSetQuestion,
//     storedData?: { canonicalItems: RangeSetItem[]; userItems?: RangeSetItem[] },
// ): RangeSetQuestion {
//     if (storedData) {
//         if (storedData.canonicalItems) {
//             const storedMap = new Map(storedData.canonicalItems.map((item) => [item.itemId, item]));
//             for (const item of question.canonicalItems) {
//                 const storedItem = storedMap.get(item.itemId);
//                 item.value = storedItem?.value ?? item.value;
//                 item.displayOrder = storedItem?.displayOrder ?? item.displayOrder;
//             }
//         }
//         if (question.allowUserItems && storedData.userItems) {
//             question.userItems = [...storedData.userItems];
//         }
//     }
//     return question;
// }

export function isQuestionComplete(question: RangeSetQuestion): boolean {
    const items = [...question.canonicalItems, ...question.userItems ?? []];
    switch (question.required) {
        case "all":
            return items.every((item) => item.value !== undefined);
        case "any":
            return items.some((item) => item.value !== undefined);
        default:
            return true;
    }
}

export function resetItemValue(question: RangeSetQuestion, itemId: string): void {
    if (isUserItem(question, itemId)) {
        deleteUserItem(question, itemId);
        return;
    }

    const item = question.canonicalItems.find((item) => item.itemId === itemId);
    if (item) {
        item.value = undefined;
    }
}

export function addUserItem(question: RangeSetQuestion, itemText: string): void {
    if (!question.allowUserItems) return;
    const itemId = normalizeItemId(itemText);
    if (itemId.length === 0) return;
    const items = [...question.canonicalItems, ...question.userItems ?? []];
    if (items.some((item) => item.itemId === itemId)) return;

    const newItem: RangeSetItem = {
        itemId,
        itemText,
        value: question.initialValue ?? question.min,
        displayOrder: items.length + 1,
    };

    question.userItems = [...question.userItems ?? [], newItem];
}

export function deleteUserItem(question: RangeSetQuestion, itemId: string): void {
    if (!question.allowUserItems) return;
    question.userItems = (question.userItems ?? []).filter((item) => item.itemId !== itemId);
}

export function isUserItem(question: RangeSetQuestion, itemId: string): boolean {
    return (question.userItems ?? []).some((item) => item.itemId === itemId);
}

export function resolveDisplayOrder(
    items: RangeSetItem[],
    randSeed?: string | number,
): RangeSetItem[] {
    const resolvedItems = items.map((item) => ({ ...item }));
    let positiveDisplayIndices: RangeSetItem[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder >= 0
    );

    positiveDisplayIndices = shuffleSameDisplayIndexGroups(positiveDisplayIndices, randSeed);
    let negativeDisplayIndices: RangeSetItem[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder < 0
    );

    negativeDisplayIndices = shuffleSameDisplayIndexGroups(negativeDisplayIndices, randSeed);
    let undefinedDisplayIndices: RangeSetItem[] = resolvedItems.filter((item) =>
        item.displayOrder === undefined
    );

    undefinedDisplayIndices = FisherYatesShuffle(undefinedDisplayIndices, randSeed);

    const randomizedItems: RangeSetItem[] = [
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
    items: RangeSetItem[],
    randSeed?: string | number,
): RangeSetItem[] {
    const groups = new Map<number, RangeSetItem[]>();
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

export function getTicks(range: [number, number], tickInterval: number): number[] {
    const ticks: number[] = [];
    for (let i = range[0]; i <= range[1]; i += tickInterval) {
        ticks.push(i);
    }

    return ticks;
}

function normalizeItemId(itemText: string): string {
    return itemText.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}

export function clientsideSanitize(text: string): string {
    if (!browser) return text;
    return DOMPurify.sanitize(text);
}
