import type { MultipleChoiceQuestion } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

export const multipleChoiceQuestions: MultipleChoiceQuestion[] = [
    // {
    //     qid: "ccg-01:CQ-1-0",
    //     questionText: "0. Test question?",
    //     inputType: "radio",
    //     required: "all",
    //     showFeedback: true,
    //     allowReset: true,
    //     allowUserItems: true,
    //     canonicalItems: [
    //         {
    //             itemId: "same-option",
    //             itemText: "To choose the <u>same</u> option as the other player.",
    //             isTrue: true,
    //         },
    //         {
    //             itemId: "different-option",
    //             itemText: "To choose a <u>different</u> option than the other player.",
    //             isTrue: false,
    //         },
    //         {
    //             itemId: "favorite-option",
    //             itemText: "To choose my <u>favorite</u> option.",
    //             isTrue: false,
    //         },
    //         // {
    //         //     itemId: "true-option",
    //         //     itemText: "This is a <u>true</u> option.",
    //         //     isTrue: true,
    //         // },
    //     ],
    // },
    {
        qid: "cq:gd1:1",
        questionText: "1. What is the main goal in each round of the game?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        allowReset: true,
        canonicalItems: [
            {
                itemId: "same-option",
                itemText: "To choose the <u>same</u> option as the other player.",
                isTrue: true,
            },
            {
                itemId: "different-option",
                itemText: "To choose a <u>different</u> option than the other player.",
                isTrue: false,
            },
            {
                itemId: "favorite-option",
                itemText: "To choose my <u>favorite</u> option.",
                isTrue: false,
            },
        ],
    },
    {
        qid: "cq:gd1:2",
        questionText: "2. Who is the other player in a game round?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            {
                itemId: "another-participant",
                itemText: "<u>Another participant</u> in this experiment.",
                isTrue: true,
            },
            {
                itemId: "computer-program",
                itemText: "A <u>computer program</u>.",
                isTrue: false,
            },
            {
                itemId: "no-other-player",
                itemText: "There is no other player.",
                isTrue: false,
            },
        ],
    },
    {
        qid: "cq:gd1:3",
        questionText: "3. What does earning points do?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            {
                itemId: "increase-final-payoff",
                itemText: "Earned points <u>increase my final payoff</u>.",
                isTrue: true,
            },
            {
                itemId: "have-no-effect",
                itemText: "Earned points are just for fun and <u>have no effect</u>.",
                isTrue: false,
            },
            {
                itemId: "given-to-other-player",
                itemText: "Earned points are <u>given to the other player</u>.",
                isTrue: false,
            },
        ],
    },
    {
        qid: "cq:gd1:4",
        questionText:
            "4. If you chose option 1 and the other player chose option 1, how many points would you receive?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            { itemId: "0-points", itemText: "<u>0</u> points", isTrue: false },
            { itemId: "1-points", itemText: "<u>1</u> points", isTrue: false },
            { itemId: "2-points", itemText: "<u>2</u> points", isTrue: true },
        ],
    },
    {
        qid: "cq:gd1:5",
        questionText:
            "5. If you chose option 2 and the other player chose option 2, how many points would you receive?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            { itemId: "0-points", itemText: "<u>0</u> point", isTrue: false },
            { itemId: "1-points", itemText: "<u>1</u> points", isTrue: true },
            { itemId: "2-points", itemText: "<u>2</u> point", isTrue: false },
        ],
    },
    {
        qid: "cq:gd1:6",
        questionText:
            "6. If you chose option 1 and the other player chose option 2, how many points would you receive?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            { itemId: "0-points", itemText: "<u>0</u> points", isTrue: true },
            { itemId: "1-points", itemText: "<u>1</u> points", isTrue: false },
            { itemId: "2-points", itemText: "<u>2</u> point", isTrue: false },
        ],
    },
    // {
    //     qid: "ccg-01:CQ-1-7",
    //     questionText:
    //         "7. If you chose option 2 and the other player chose option 1, how many points would you receive?",
    //     inputType: "radio",
    //     required: "all",
    //     showFeedback: true,
    //     canonicalItems: [
    //         { itemId: "0-points", itemText: "<u>0</u> points", isTrue: true },
    //         { itemId: "1-points", itemText: "<u>1</u> points", isTrue: false },
    //         { itemId: "2-points", itemText: "<u>2</u> point", isTrue: false },
    //     ],
    // },
];
