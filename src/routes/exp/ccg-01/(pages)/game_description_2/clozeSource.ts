import type { ClozeQuestionSource } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";

export const clozeQuestionSources: ClozeQuestionSource[] = [
    {
        qid: "cq:gd2:other-players",
        label: "Color prediction slider",
        content: [
            "The color slider is how I give my prediction for [magnitude: *[the percentage of other participants], [how much I'll like]]  that [value: *[will choose each color], [particular color]].",
            "I can also think of this as [prediction-slider-interpretation: *[how likely the other player is to choose each color], [how much the other player will like each color]].",
            "If I think that most other players will choose a particular color, then I should set that color to [slider-best-response: *[at least 50%], [less than 50%], [less than 25%]] of the slider.",
            "Predictions that are [prediction-accuracy-1: *[more accurate], [less accurate]] earn more points than predictions that are [prediction-accuracy-2: *[less accurate], [more accurate]].",
            "Prediction points are earned [prediction-coordination-points: *[in addition to], [only if I earn]] any points for coordinating with the other player.",
        ],
        randomize: "",
    },
];
