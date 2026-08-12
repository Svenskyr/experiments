import type { MultipleChoiceQuestion } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

export const multipleChoiceQuestions: MultipleChoiceQuestion[] = [
    {
        qid: "cq:gd2:1",
        questionText: "1. What does the color slider represent?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            {
                itemId: "expected-proportion",
                itemText: "The proportion of players that I <u>expect</u> to choose each option.",
                isTrue: true,
            },
            {
                itemId: "wanted-proportion",
                itemText: "How much I <u>want</u> other players to choose each option.",
                isTrue: false,
            },
            {
                itemId: "color-preference",
                itemText: "My <u>aesthetic preference</u> for each color.",
                isTrue: false,
            },
        ],
    },
    {
        qid: "cq:gd2:2",
        questionText:
            "2. If you expect <em>most</em> players to choose Color 1, how much of the slider should be Color 1?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            { itemId: "atleast-50", itemText: "At least <u>50%</u>.", isTrue: true },
            { itemId: "atleast-25", itemText: "At least <u>25%</u>.", isTrue: false },
            { itemId: "atleast-0", itemText: "At least <u>0%</u>.", isTrue: false },
            { itemId: "always-100", itemText: "Always <u>100%</u>.", isTrue: false },
        ],
    },
];
