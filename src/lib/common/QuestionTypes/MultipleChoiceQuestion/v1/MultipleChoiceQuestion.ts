import { FisherYatesShuffle } from "$lib/Randomization.ts";
import debugLib from "debug";
const debug = debugLib("ccg-01:MCQ");

export interface MultipleChoiceOption {
    optionText: string;
    isTrue?: boolean;
    propIndex?: number;
    displayIndex?: number;
    isSelected?: boolean;
    wasEverSelected?: boolean;
    allowTextEntry?: boolean;
}

export interface ClientStoredResponse {
    optionText: string;
    displayIndex: number;
    isSelected: boolean;
    wasEverSelected: boolean;
}

export interface MultipleChoiceQuestion {
    data: {
        qid: string;
        questionText: string;
        responses: MultipleChoiceOption[];
        inputType: "radio" | "checkbox";
        required?: boolean;
        randSeed?: string;
        showFeedback?: boolean;
        showScore?: boolean;
        allowReset?: boolean;
    };
    onComplete?: () => void;
    exportScoreArray?: () => number[];
    exportResponseArray?: () => MultipleChoiceOption[];
}

export function constructQuestionObject(props: MultipleChoiceQuestion): MultipleChoiceQuestion {
    const responses = props.data.responses.map((response, index) => ({
        ...response,
        propIndex: index,
    }));

    const randomizedResponses = assignDisplayIndicesToResponses(
        responses,
        JSON.stringify({ randSeed: props.data.randSeed, qid: props.data.qid }),
    );

    const questionObject: MultipleChoiceQuestion = {
        ...props,
        data: {
            ...props.data,
            responses: randomizedResponses,
        },
    };

    return questionObject;
}

/** Assigns displayIndex to each response that does not have one.
    Intended display order:
    <positive displayIndex, ascending>
    <undefined displayIndex, shuffled>
    <negative displayIndex, ascending>
*/
function assignDisplayIndicesToResponses(
    responses: MultipleChoiceOption[],
    randSeed?: string,
): MultipleChoiceOption[] {
    let positiveDisplayIndices: MultipleChoiceOption[] = responses.filter((response) =>
        response.displayIndex !== undefined && response.displayIndex >= 0
    );
    positiveDisplayIndices = positiveDisplayIndices.sort((a, b) =>
        a.displayIndex! - b.displayIndex!
    );
    debug(`positiveDisplayIndices: ${JSON.stringify(positiveDisplayIndices, null, 2)}`);
    let negativeDisplayIndices: MultipleChoiceOption[] = responses.filter((response) =>
        response.displayIndex !== undefined && response.displayIndex < 0
    );
    negativeDisplayIndices = negativeDisplayIndices.sort((a, b) =>
        a.displayIndex! - b.displayIndex!
    );
    debug(`negativeDisplayIndices: ${JSON.stringify(negativeDisplayIndices, null, 2)}`);
    let undefinedDisplayIndices: MultipleChoiceOption[] = responses.filter((response) =>
        response.displayIndex === undefined
    );
    undefinedDisplayIndices = FisherYatesShuffle(undefinedDisplayIndices, randSeed);
    debug(`undefinedDisplayIndices: ${JSON.stringify(undefinedDisplayIndices, null, 2)}`);
    const randomizedResponses = [
        ...positiveDisplayIndices,
        ...undefinedDisplayIndices,
        ...negativeDisplayIndices,
    ];
    // Assign displayIndex to each response.
    randomizedResponses.forEach((response, index) => {
        response.displayIndex = index + 1;
    });
    return randomizedResponses;
}

export function storeClientResponses(questionObject: MultipleChoiceQuestion) {
    const responses = questionObject.data.responses.map((response) => ({
        optionText: response.optionText,
        displayIndex: response.displayIndex,
        isSelected: response.isSelected,
        wasEverSelected: response.wasEverSelected,
    }));
    localStorage.setItem(questionObject.data.qid, JSON.stringify(responses));
}

export function restoreClientResponses(
    questionObject: MultipleChoiceQuestion,
): MultipleChoiceQuestion {
    const storedResponses: ClientStoredResponse[] = JSON.parse(
        localStorage.getItem(questionObject.data.qid) || "[]",
    );
    questionObject.data.responses.forEach((response) => {
        const storedResponse = storedResponses.find((r) =>
            r.displayIndex === response.displayIndex
        );
        if (storedResponse) {
            response.optionText = storedResponse.optionText;
            response.displayIndex = storedResponse.displayIndex;
            response.isSelected = storedResponse.isSelected;
            response.wasEverSelected = storedResponse.wasEverSelected;
        }
    });
    return questionObject;
}
