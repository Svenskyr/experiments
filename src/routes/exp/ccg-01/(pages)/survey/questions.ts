import type { MultipleChoiceQuestion } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion";
import type { RangeSetQuestion } from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.ts";

export const rangeSetQuestions: RangeSetQuestion[] = [
    {
        qid: "survey-gender-identity",
        questionText: "1. What do you identify as?",
        min: 0,
        max: 10,
        step: 0.5,
        tickInterval: 2,
        initialValue: 0,
        allowUserItems: true,
        rangeLabels: ["Not at all", "Strongly"],
        required: "any",
        canonicalItems: [
            {
                itemId: "identity-female",
                itemText: "Female",
            },
            {
                itemId: "identity-male",
                itemText: "Male",
            },
        ],
    },
    {
        qid: "survey-gender-factors",
        questionText: "2. How important are these factors to gender?",
        min: 0,
        max: 10,
        step: 0.5,
        tickInterval: 1,
        initialValue: 0,
        allowUserItems: true,
        required: "any",
        rangeLabels: ["Not important at all", "Somewhat important", "Very important"],
        canonicalItems: [
            {
                itemId: "gender-chromosomal-sex",
                itemText: "Chromosomal sex",
                tooltipText: "(e.g., XX or XY)",
            },
            {
                itemId: "gender-hormones",
                itemText: "Hormones",
                tooltipText: "(e.g., testosterone or estrogen)",
            },
            {
                itemId: "gender-socialization",
                itemText: "Socialization",
                tooltipText: "(e.g., how someone was raised)",
            },
            {
                itemId: "gender-identity",
                itemText: "Identity",
                tooltipText: "(e.g., what someone considers themselves to be)",
            },
            {
                itemId: "gender-sexuality",
                itemText: "Sexuality",
                tooltipText: "(e.g., heterosexual, homosexual, bisexual, etc.)",
            },
        ],
    },
    {
        qid: "survey-gender-norms",
        questionText: "3. What do you think about gender norms?",
        min: 0,
        max: 10,
        step: 0.5,
        tickInterval: 1,
        initialValue: 0,
        required: "all",
        rangeLabels: [
            "Strongly disagree",
            "Somewhat disagree",
            "Somewhat agree",
            "Strongly agree",
        ],
        canonicalItems: [
            {
                itemId: "gender-norms-their-culture",
                itemText: "People ought to follow <em>their</em> culture's gender norms.",
                displayOrder: 1,
            },
            {
                itemId: "gender-norms-my-culture",
                itemText: "People ought to follow <em>my</em> culture's gender norms.",
                displayOrder: 1,
            },
            {
                itemId: "attention-check",
                itemText: "Please set this value to <em>two point five</em>.",
                displayOrder: 2,
                tooltipText: "Just making sure you're paying attention.",
            },
            {
                itemId: "gender-norms-functional",
                itemText: "On average, my culture's gender norms are <em>functional</em>.",
                displayOrder: 3,
                tooltipText: "Functionality <em>regardless of fairness</em>.",
            },
            {
                itemId: "gender-norms-fairness",
                itemText: "On average, my culture's gender norms are <em>fair</em>.",
                displayOrder: 3,
                tooltipText: "Fairness <em>regardless of functionality</em>.",
            },
            // {
            //     itemId: "homicide-morality",
            //     itemText: "I think homicide is sometimes morally justified.",
            //     displayOrder: -1,
            //     tooltipText:
            //         "Homicide is sometimes morally justified, though it's never legally justified by definition.",
            // },
        ],
    },
    {
        qid: "survey-political-orientation",
        questionText: "4. How would you describe your social views?",
        min: 0,
        max: 10,
        step: 0.5,
        tickInterval: 1,
        initialValue: 0,
        allowUserItems: true,
        required: "any",
        rangeLabels: ["Not at all", "Somewhat", "Strongly"],
        canonicalItems: [
            {
                itemId: "political-orientation-liberal",
                itemText: "Liberal",
                tooltipText:
                    "If you differentiate between liberal and leftist, please specify below.",
            },
            {
                itemId: "political-orientation-conservative",
                itemText: "Conservative",
            },
        ],
    },
];

export const multipleChoiceQuestions: MultipleChoiceQuestion[] = [
    {
        qid: "survey-color-blindness",
        questionText: "5. Do you have any form of color blindness?",
        inputType: "radio",
        required: "any",
        allowUserItems: true,
        canonicalItems: [
            {
                itemId: "none",
                itemText: "I do <strong>not</strong> have any form of color blindness.",
                displayOrder: 1,
            },
            {
                itemId: "red-green",
                itemText: "I have a form of <strong>red-green</strong> color blindness.",
            },
            {
                itemId: "blue-yellow",
                itemText: "I have a form of <strong>blue-yellow</strong> color blindness.",
            },
            {
                itemId: "total-color-blindness",
                itemText: "I have a form of <strong>total</strong> color blindness.",
                displayOrder: -1,
            },
        ],
    },
];
