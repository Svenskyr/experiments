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
        qid: "cq:gd1:points-effect",
        questionText: "1. What does <em>earning points</em> do?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        allowReset: true,
        canonicalItems: [
            {
                itemId: "increase-final-payoff",
                itemText: "Earning points <u>increase my final payoff</u>.",
                isTrue: true,
            },
            {
                itemId: "have-no-effect",
                itemText:
                    "Earning points is just for fun and <u>does not affect my final payoff</u>.",
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
        qid: "cq:gd1:most-points-choice",
        questionText: "2. Which of these always earns the <em>most</em> points?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            {
                itemId: "same-option",
                itemText: "Coordinating on the <u>same</u> option as the other player.",
                isTrue: true,
            },
            {
                itemId: "different-option",
                itemText:
                    "Miscoordinating and choosing a <u>different</u> option than the other player.",
                isTrue: false,
            },
            {
                itemId: "favorite-option",
                itemText: "Choosing my <u>favorite</u> option.",
                isTrue: false,
            },
        ],
    },
    {
        qid: "cq:gd1:player-selection-method",
        questionText: "3. How is the other player selected?",
        inputType: "radio",
        required: "all",
        showFeedback: true,
        canonicalItems: [
            {
                itemId: "selected-randomly",
                itemText: "The other player is <u>selected randomly each round</u>.",
                isTrue: true,
            },
            {
                itemId: "selected-once",
                itemText:
                    "The other player is <u>selected once</u> and then stays the same for the entire study.",
                isTrue: false,
            },
            {
                itemId: "selected-by-me",
                itemText: "The other player is <u>selected by me</u>.",
                isTrue: false,
            },
        ],
    },

    {
        qid: "cq:gd1:points-received-left-same",
        questionText:
            "5. If you chose the <em>left</em> option and the other player chose the <em>same</em> option, how many points would you receive?",
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
        qid: "cq:gd1:points-received-right-same",
        questionText:
            "6. If you chose the <em>right</em> option and the other player chose the <em>same</em> option, how many points would you receive?",
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
        qid: "cq:gd1:points-received-left-different",
        questionText:
            "7. If you chose the <em>left</em> option and the other player chose a <em>different</em> option, how many points would you receive?",
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
