import debugLib from "debug";
const debug = debugLib("ccg-01:MCQ");

export interface MultipleChoiceItem {
    itemId: string;
    itemText: string;
    isTrue?: boolean;
    displayOrder?: number;
    isSelected?: boolean;
    wasSelected?: boolean;
}

export interface ClientStoredResponse {
    itemId: string;
    itemText: string;
    isSelected: boolean;
    wasSelected: boolean;
}

export interface MultipleChoiceQuestion {
    qid: string;
    questionText: string;
    items: MultipleChoiceItem[];
    inputType: "radio" | "checkbox";
    required?: "none" | "any" | "all";
    randSeed?: string;
    showFeedback?: boolean;
    showScore?: boolean;
    allowReset?: boolean;
    allowUserItems?: boolean;
}

export function constructMultipleChoiceQuestion(
    props: MultipleChoiceQuestion,
): MultipleChoiceQuestion {
    const multipleChoiceQuestion: MultipleChoiceQuestion = {
        ...props,
        items: resolveDisplayOrder(props.items, props.randSeed),
    };
    return multipleChoiceQuestion;
}

import { FisherYatesShuffle } from "$lib/Randomization.ts";

/** Shuffles items within each displayIndex group while preserving ascending group order. */
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

function resolveDisplayOrder(
    items: MultipleChoiceItem[],
    randSeed?: string | number,
): MultipleChoiceItem[] {
    const resolvedItems = items.map((item) => ({ ...item }));
    let positiveDisplayIndices: MultipleChoiceItem[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder >= 0
    );

    positiveDisplayIndices = shuffleSameDisplayIndexGroups(positiveDisplayIndices, randSeed);
    let negativeDisplayIndices: MultipleChoiceItem[] = resolvedItems.filter((item) =>
        item.displayOrder !== undefined && item.displayOrder < 0
    );

    negativeDisplayIndices = shuffleSameDisplayIndexGroups(negativeDisplayIndices, randSeed);
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

export function createUserItem(
    userInput: string,
): MultipleChoiceItem {
    let itemId = userInput.trim().toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
    return {
        itemId: itemId,
        itemText: userInput,
    };
}

export function getUserItems(
    multipleChoiceQuestion: MultipleChoiceQuestion,
    boundValues: Record<string, number | null>,
): string[] {
    return Object.keys(boundValues).filter((key) =>
        !multipleChoiceQuestion.items.some((item) => item.itemId === key)
    );
}

// export function constructQuestionObject(props: MultipleChoiceQuestion): MultipleChoiceQuestion {
//     const responses = props.data.responses.map((response, index) => ({
//         ...response,
//         propIndex: index,
//     }));

//     const randomizedResponses = assignDisplayIndicesToResponses(
//         responses,
//         JSON.stringify({ randSeed: props.data.randSeed, qid: props.data.qid }),
//     );

//     const questionObject: MultipleChoiceQuestion = {
//         ...props,
//         data: {
//             ...props.data,
//             responses: randomizedResponses,
//         },
//     };

//     return questionObject;
// }

// /** Assigns displayIndex to each response that does not have one.
//     Intended display order:
//     <positive displayIndex, ascending>
//     <undefined displayIndex, shuffled>
//     <negative displayIndex, ascending>
// */
// function assignDisplayIndicesToResponses(
//     responses: MultipleChoiceOption[],
//     randSeed?: string,
// ): MultipleChoiceOption[] {
//     let positiveDisplayIndices: MultipleChoiceOption[] = responses.filter((response) =>
//         response.displayIndex !== undefined && response.displayIndex >= 0
//     );
//     positiveDisplayIndices = positiveDisplayIndices.sort((a, b) =>
//         a.displayIndex! - b.displayIndex!
//     );
//     debug(`positiveDisplayIndices: ${JSON.stringify(positiveDisplayIndices, null, 2)}`);
//     let negativeDisplayIndices: MultipleChoiceOption[] = responses.filter((response) =>
//         response.displayIndex !== undefined && response.displayIndex < 0
//     );
//     negativeDisplayIndices = negativeDisplayIndices.sort((a, b) =>
//         a.displayIndex! - b.displayIndex!
//     );
//     debug(`negativeDisplayIndices: ${JSON.stringify(negativeDisplayIndices, null, 2)}`);
//     let undefinedDisplayIndices: MultipleChoiceOption[] = responses.filter((response) =>
//         response.displayIndex === undefined
//     );
//     undefinedDisplayIndices = FisherYatesShuffle(undefinedDisplayIndices, randSeed);
//     debug(`undefinedDisplayIndices: ${JSON.stringify(undefinedDisplayIndices, null, 2)}`);
//     const randomizedResponses = [
//         ...positiveDisplayIndices,
//         ...undefinedDisplayIndices,
//         ...negativeDisplayIndices,
//     ];
//     // Assign displayIndex to each response.
//     randomizedResponses.forEach((response, index) => {
//         response.displayIndex = index + 1;
//     });
//     return randomizedResponses;
// }

// export function storeClientResponses(questionObject: MultipleChoiceQuestion) {
//     const responses = questionObject.data.responses.map((response) => ({
//         optionText: response.optionText,
//         displayIndex: response.displayIndex,
//         isSelected: response.isSelected,
//         wasEverSelected: response.wasEverSelected,
//     }));
//     localStorage.setItem(questionObject.data.qid, JSON.stringify(responses));
// }

// export function restoreClientResponses(
//     questionObject: MultipleChoiceQuestion,
// ): MultipleChoiceQuestion {
//     const storedResponses: ClientStoredResponse[] = JSON.parse(
//         localStorage.getItem(questionObject.data.qid) || "[]",
//     );
//     questionObject.data.responses.forEach((response) => {
//         const storedResponse = storedResponses.find((r) =>
//             r.displayIndex === response.displayIndex
//         );
//         if (storedResponse) {
//             response.optionText = storedResponse.optionText;
//             response.displayIndex = storedResponse.displayIndex;
//             response.isSelected = storedResponse.isSelected;
//             response.wasEverSelected = storedResponse.wasEverSelected;
//         }
//     });
//     return questionObject;
// }
