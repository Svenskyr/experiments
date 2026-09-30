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
            // "If someone is matched with me, then I will [asymmetric: *[not necessarily], [necessarily]] be matched with them in <em>their</em> game round.",
        ],
        randomize: "",
    },
    {
        qid: "cq:gd1:earning-points",
        label: "Earning points",
        content: [
            "I earn points by [coordinating: *[coordinating], [miscoordinating]] on [choice: *[the same option as], [a different option than]] other players.",
            "The points I earn [effect: *[increase], [decrease]] [target: *[my final payoff], [how many rounds I can play]].",
            "In the payoff table, the points that I would earn from an outcome are the [payoff-points: *[first], [second]] number in the pair.",
            // "My choices [relation: *[probabilistically], [directly]] affect the outcomes of the players that I [other-players-affected: *[could be], [am actually]] matched with.",
        ],
        randomize: "",
    },
];
