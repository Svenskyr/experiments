import type { MultipleChoiceQuestion } from "../../_components/Q-MultipleChoice/v4/MultipleChoiceQuestion.ts";

export const roleQuestion: MultipleChoiceQuestion = {
    qid: "ccg-01:registration-role",
    questionText: "I am a...",
    inputType: "radio",
    required: "any",
    allowUserItems: true,
    canonicalItems: [
        {
            itemId: "tester",
            itemText: "Tester",
            displayOrder: 1,
        },
        {
            itemId: "unspecified",
            itemText: "Unspecified",
            displayOrder: 2,
        },
    ],
};
