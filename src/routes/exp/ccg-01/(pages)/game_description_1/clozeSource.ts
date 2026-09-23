import type { ClozeQuestionSource } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";

export const clozeQuestionSources: ClozeQuestionSource[] = [
    {
        qid: "cq:gd1:other-players",
        label: "Other players",
        content: [
            "The other players in this game are [player-type: *[participants of this study], [computer programs], [AI agents]].",
            "Other players are selected [method: *[randomly], [by me]] [frequency: *[each round], [only once]].", // from a set of [pool: *[all possible players], [four (4) players]].",
            // "If someone is chosen to be the other player in my game round, then that [1: *[does not], [does]] mean that I [2: *[will], [will not]] be chosen to be the other player in their game round.",
            'For the other players chosen to be in <em>my</em> game rounds, the "other players" in <em>their</em> game rounds will be selected [other-other-player: *[randomly], [by them]].',
            "If someone is matched with me, then I will [asymmetric: *[not necessarily], [necessarily]] be matched with them in <em>their</em> game round.",
        ],
        randomize: "",
    },
    {
        qid: "cq:gd1:earning-points",
        label: "Earning points",
        content: [
            "I earn points by [coordinating: *[coordinating], [miscoordinating]] on [choice: *[the same option as], [a different option than]] other players.",
            "The points I earn [effect: *[increase], [decrease]] [target: *[my final payoff], [how many rounds I can play]].",
        ],
        randomize: "",
    },

    {
        qid: "cq:gd1:outcome-points",
        label: "Round outcomes",
        content: [
            "If I chose the option on the left and the other player chose same option, I'll earn [points-left: *[2 points], [1 point], [0 points]] for that round.",
            "If I chose the option on the right and the other player chose same option, I'll earn [points-right: *[1 point], [2 points], [0 points]] for that round.",
            "If the other player and I chose different options, I'll earn [points-miscoordinate: *[0 points], [1 point], [2 points]] for that round.",
            // "If I earned 2 points in a round, then the other player earned [other-points: *[an unknown number of], [two (2) points], [one (1) point], [zero (0) points]] points because matching is [method: *[asymmetric], [symmetric]].",
        ],
        randomize: "",
    },
];
