import debugLib from "debug";
const debug = debugLib("RangeSet.ts");
export interface RangeSetProps {
    qid: string;
    legendText: string; // Text to display in the legend (e.g., "How much do you...")
    min: number;
    max: number;
    step: number;
    tickInterval?: number;
    initialValue?: number;
    rangeLabels?: string[];
    items: RangeSetItemProps[];
    randSeed?: string | number;
}

export interface RangeSet {
    qid: string;
    legendText: string;
    min: number;
    max: number;
    step: number;
    tickInterval?: number;
    initialValue: number;
    rangeLabels?: string[];
    items: RangeSetItem[];
    randSeed?: string | number;
}

export interface RangeSetItemProps {
    itemId: string;
    nameLabel?: string; // Label for the input value (e.g., "...like slider questions?")
    displayIndex?: number; // Display index; undefined 🠖 randomized, positive 🠖 first, negative 🠖 last
}

export interface RangeSetItem {
    inputValue: number | null;
    itemId: string;
    nameLabel?: string;
    displayIndex: number;
}

export function constructRangeSetObject(props: RangeSetProps): RangeSet {
    // const initialValue = props.initialValue ?? Math.round((props.max + props.min) / 2);
    // const stored = restoreClientResponses(props.qid);
    // if (stored.length > 0) {
    //     debug("constructRangeSetObject: stored items found", stored);
    //     return {
    //         ...props,
    //         initialValue: props.initialValue ?? props.min,
    //         items: stored,
    //     };
    // }
    let rangeSetObject: RangeSet = {
        ...props,
        initialValue: props.initialValue ?? props.min,
        items: assignDisplayIndices(props.items, props.randSeed).map((
            item: RangeSetItemProps,
        ): RangeSetItem => ({
            inputValue: null,
            ...item,
            nameLabel: item.nameLabel ?? "",
            displayIndex: item.displayIndex ?? NaN,
        })),
    };
    debug("constructRangeSetObject: new items created", JSON.stringify(rangeSetObject, null, 2));
    return rangeSetObject;
}

export function storeClientResponses(qid: string, values: Record<string, number | null>): void {
    localStorage.setItem(qid, JSON.stringify(values));
}

export function restoreClientResponses(rangeSetObject: RangeSet): RangeSet {
    const storedValues: Record<string, number | null> | null = JSON.parse(
        localStorage.getItem(rangeSetObject.qid) || "{}",
    );
    if (storedValues) {
        rangeSetObject.items.forEach((item) => {
            item.inputValue = storedValues[item.itemId] ?? null;
        });
    }
    return rangeSetObject;
}

export function retrieveClientResponses(qid: string): Record<string, number | null> {
    const storedValues: Record<string, number | null> | null = JSON.parse(
        localStorage.getItem(qid) || "{}",
    );
    return storedValues || {};
}

import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";

/** Shuffles items within each displayIndex group while preserving ascending group order. */
function shuffleSameDisplayIndexGroups(
    items: RangeSetItemProps[],
    randSeed?: string | number,
): RangeSetItemProps[] {
    const groups = new Map<number, RangeSetItemProps[]>();
    for (const item of items) {
        const displayIndex = item.displayIndex!;
        const group = groups.get(displayIndex) ?? [];
        group.push(item);
        groups.set(displayIndex, group);
    }

    const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
    return sortedKeys.flatMap((displayIndex) =>
        FisherYatesShuffle(
            groups.get(displayIndex)!,
            randSeed !== undefined ? `${randSeed}:${displayIndex}` : undefined,
        )
    );
}

/** Assigns displayIndex to each item that does not have one.
    Display order:
    <positive displayIndex, ascending: 1, 2, 3, ...>
    <undefined displayIndex, shuffled>
    <negative displayIndex, ascending: ..., -3, -2, -1>
    Items sharing the same displayIndex are shuffled within that group.
*/
function assignDisplayIndices(
    items: RangeSetItemProps[],
    randSeed?: string | number,
): RangeSetItemProps[] {
    let positiveDisplayIndices: RangeSetItemProps[] = items.filter((item) =>
        item.displayIndex !== undefined && item.displayIndex >= 0
    );
    debug(
        "assignDisplayIndices: positiveDisplayIndices",
        JSON.stringify(positiveDisplayIndices, null, 2),
    );
    positiveDisplayIndices = shuffleSameDisplayIndexGroups(positiveDisplayIndices, randSeed);
    let negativeDisplayIndices: RangeSetItemProps[] = items.filter((item) =>
        item.displayIndex !== undefined && item.displayIndex < 0
    );
    debug(
        "assignDisplayIndices: negativeDisplayIndices",
        JSON.stringify(negativeDisplayIndices, null, 2),
    );
    negativeDisplayIndices = shuffleSameDisplayIndexGroups(negativeDisplayIndices, randSeed);
    let undefinedDisplayIndices: RangeSetItemProps[] = items.filter((item) =>
        item.displayIndex === undefined
    );
    debug(
        "assignDisplayIndices: undefinedDisplayIndices",
        JSON.stringify(undefinedDisplayIndices, null, 2),
    );
    undefinedDisplayIndices = FisherYatesShuffle(undefinedDisplayIndices, randSeed);
    debug(
        "assignDisplayIndices: randomized undefinedDisplayIndices",
        JSON.stringify(undefinedDisplayIndices, null, 2),
    );

    const randomizedItems = [
        ...positiveDisplayIndices,
        ...undefinedDisplayIndices,
        ...negativeDisplayIndices,
    ];
    randomizedItems.forEach((item, index) => {
        item.displayIndex = index + 1;
    });
    debug("assignDisplayIndices: randomized items", JSON.stringify(randomizedItems, null, 2));
    return randomizedItems;
}

export function getTicks(range: [number, number], tickInterval: number) {
    const ticks: number[] = [];
    for (let i = range[0]; i <= range[1]; i += tickInterval) {
        ticks.push(i);
    }

    return ticks;
}
