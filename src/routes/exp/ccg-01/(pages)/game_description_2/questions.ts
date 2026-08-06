import type { MultipleChoiceQuestion } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

export const multipleChoiceQuestions: MultipleChoiceQuestion[] = [
    {
        qid: "cq:gd2:1",
        questionText: "1. What do the colors on the slider represent?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            {
                itemId: "expected-proportion",
                itemText: "The proportion of players that I think will choose each option.",
                isTrue: true,
            },
            {
                itemId: "wanted-proportion",
                itemText: "How much I want other players to choose each option.",
                isTrue: false,
            },
            {
                itemId: "popsicle",
                itemText: "How much of the popsicle is left. It keeps melting :(",
                isTrue: false,
            },
        ],
    },
    {
        qid: "cq:gd2:2",
        questionText:
            "2. If you think most players will choose Color 1, which choice is consistent with your prediction?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            { itemId: "color-1", itemText: "Color 1.", isTrue: true },
            { itemId: "color-2", itemText: "Color 2.", isTrue: false },
            { itemId: "both-colors", itemText: "Both colors.", isTrue: false },
            { itemId: "neither-color", itemText: "Neither color.", isTrue: false },
        ],
    },
];
