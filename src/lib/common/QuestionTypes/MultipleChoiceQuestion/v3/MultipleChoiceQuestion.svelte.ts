import type { BooleanLiteral } from "typescript";
import type {
    ClientStoredResponse,
    MultipleChoiceItem,
    MultipleChoiceQuestionInterface,
} from "./interfaces.ts";
import { FisherYatesShuffle } from "$lib/Randomization.ts";

export class MultipleChoiceItemClass {
    itemId: string;
    itemText: string;
    isTrue?: boolean;
    displayOrder?: number;

    isSelected = $state(false);
    wasSelected = $state(false);

    constructor(data: MultipleChoiceItem) {
        this.itemId = data.itemId;
        this.itemText = data.itemText;
        this.isTrue = data.isTrue;
        this.displayOrder = data.displayOrder;
        this.isSelected = data.isSelected ?? false;
        this.wasSelected = data.wasSelected ?? this.isSelected;
    }

    select(value: boolean) {
        this.isSelected = value;
        if (value) this.wasSelected = true;
    }

    get dehydratedItem(): ClientStoredResponse {
        return {
            itemId: this.itemId,
            itemText: this.itemText,
            isSelected: this.isSelected,
            wasSelected: this.wasSelected,
        };
    }

    hydrate(data: ClientStoredResponse) {
        this.itemId = data.itemId;
        this.itemText = data.itemText;
        this.isSelected = data.isSelected;
        this.wasSelected = data.wasSelected;
    }
}

export class MultipleChoiceQuestionClass {
    readonly qid: string;
    readonly questionText: string;
    readonly inputType: "radio" | "checkbox";
    readonly required: "none" | "any" | "all";
    readonly randSeed?: string;
    readonly allowReset: boolean;
    readonly allowUserItems: boolean;

    items: MultipleChoiceItemClass[] = $state([]);

    constructor(data: MultipleChoiceQuestionInterface) {
        this.qid = data.qid;
        this.questionText = data.questionText;
        this.inputType = data.inputType;
        this.required = data.required ?? "none";
        this.randSeed = data.randSeed;
        this.allowReset = data.allowReset ?? false;
        this.allowUserItems = data.allowUserItems ?? false;
        this.items = data.items.map((item) => new MultipleChoiceItemClass(item));
        this.restoreClientResponses();
    }

    get isComplete(): boolean {
        switch (this.required) {
            case "any": {
                return this.items.some((item) => item.isSelected);
            }
            case "all": {
                return this.items.every((item) => {
                    const shouldBeSelected = !!item.isTrue; // wtf
                    return item.isSelected === shouldBeSelected;
                });
            }
            case "none":
            default:
                return true;
        }
    }

    selectItem(itemId: string, checked: boolean) {
        if (this.inputType === "radio") {
            for (const item of this.items) {
                if (item.itemId === itemId) {
                    item.select(checked);
                } else {
                    item.select(false);
                }
            }
        } else if (this.inputType === "checkbox") {
            const item = this.items.find((i) => i.itemId === itemId);
            if (item) {
                item.select(checked);
            }
        }
        this.storeClientResponses();
    }

    addUserItem(itemText: string) {
        if (!this.allowUserItems) return;
        const itemId = normalizeItemId(`user-${itemText}`);
        if (itemId.length === 0) return;
        if (this.items.some((item) => item.itemId === itemId)) return;
        this.items.push(
            new MultipleChoiceItemClass({
                itemId: itemId,
                itemText,
                displayOrder: this.items.length + 1,
                isSelected: false,
                wasSelected: true,
            }),
        );

        this.selectItem(itemId, true);
        this.storeClientResponses();
    }

    deleteUserItem(itemId: string) {
        if (!itemId.startsWith("user-")) return;
        this.items = this.items.filter((item) => item.itemId !== itemId);
        this.storeClientResponses();
    }

    reset() {
        for (const item of this.items) {
            item.isSelected = false;
            item.wasSelected = false;
        }
        this.storeClientResponses();
    }

    get clientStoredResponses(): ClientStoredResponse[] {
        return this.items.map((item) => ({
            itemId: item.itemId,
            itemText: item.itemText,
            isSelected: item.isSelected,
            wasSelected: item.wasSelected,
        }));
    }

    storeClientResponses() {
        const dehydratedItems = this.items.map((item) => item.dehydratedItem);
        localStorage.setItem(this.qid, JSON.stringify(dehydratedItems));
    }

    restoreClientResponses() {
        const dehydratedItems = JSON.parse(localStorage.getItem(this.qid) || "[]");
        for (const item of dehydratedItems) {
            const itemModel = this.items.find((i) => i.itemId === item.itemId);
            if (itemModel) {
                itemModel.hydrate(item);
            } else {
                this.items.push(new MultipleChoiceItemClass(item));
            }
        }
    }
}

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
