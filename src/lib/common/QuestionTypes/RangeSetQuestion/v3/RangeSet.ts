export interface RangeSetProps {
    qid: string;
    legendText: string;
    min: number;
    max: number;
    step: number;
    tickInterval?: number;
    initialValue?: number;
    rangeLabels?: string[];
    items: RangeSetItemProps[];
    randSeed?: string | number;
    allowUserItems?: boolean;
}

export interface RangeSetItemProps {
    itemId: string;
    nameLabel?: string;
    displayOrder?: number;
    tooltipText?: string;
}

export function constructRangeSet(props: RangeSetProps): RangeSetProps {
    const rangeSet: RangeSetProps = {
        ...props,
        initialValue: props.initialValue ?? props.min,
        items: resolveDisplayOrder(props.items, props.randSeed),
    };
    return rangeSet;
}

import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";

/** Shuffles items within each displayIndex group while preserving ascending group order. */
function shuffleSameDisplayIndexGroups(
    items: RangeSetItemProps[],
    randSeed?: string | number,
): RangeSetItemProps[] {
    const groups = new Map<number, RangeSetItemProps[]>();
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

function resolveDisplayOrder(
    items: RangeSetItemProps[],
    randSeed?: string | number,
): RangeSetItemProps[] {
    const resolvedItems = items.map((item) => ({ ...item }));
    let positiveDisplayIndices: RangeSetItemProps[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder >= 0
    );

    positiveDisplayIndices = shuffleSameDisplayIndexGroups(positiveDisplayIndices, randSeed);
    let negativeDisplayIndices: RangeSetItemProps[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder < 0
    );

    negativeDisplayIndices = shuffleSameDisplayIndexGroups(negativeDisplayIndices, randSeed);
    let undefinedDisplayIndices: RangeSetItemProps[] = resolvedItems.filter((item) =>
        item.displayOrder === undefined
    );

    undefinedDisplayIndices = FisherYatesShuffle(undefinedDisplayIndices, randSeed);

    const randomizedItems: RangeSetItemProps[] = [
        ...positiveDisplayIndices,
        ...undefinedDisplayIndices,
        ...negativeDisplayIndices,
    ];
    randomizedItems.forEach((item, index) => {
        item.displayOrder = index + 1;
    });
    return randomizedItems;
}

export function getTicks(range: [number, number], tickInterval: number): number[] {
    const ticks: number[] = [];
    for (let i = range[0]; i <= range[1]; i += tickInterval) {
        ticks.push(i);
    }

    return ticks;
}

export function createUserItem(
    userInput: string,
): RangeSetItemProps {
    let itemId = userInput.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
    return {
        itemId: itemId,
        nameLabel: userInput,
    };
}

export function getUserItems(
    rangeSetProps: RangeSetProps,
    boundValues: Record<string, number | null>,
): string[] {
    return Object.keys(boundValues).filter((key) =>
        !rangeSetProps.items.some((item) => item.itemId === key)
    );
}
