import type { Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { setNextPageCookie } from "../../_state/Server.ts";

import type { PageName } from "../../_state/Pages.ts";
import {
    buildClozeQuestion,
    type ClozeQuestionIR,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import { clozeQuestionSources } from "./clozeSource.ts";
import { buildOutcomePointsCloze, type OutcomePointsScenario } from "./outcomePointsCloze.ts";
import { participantRandomizationKey } from "$exp/ccg-01/_state/ExperimentState.ts";

export type ClozePageItem =
    | { kind: "standard"; question: ClozeQuestionIR }
    | { kind: "outcome-points"; question: ClozeQuestionIR; scenario: OutcomePointsScenario };

export const load: PageServerLoad = async ({ parent }) => {
    const { expState } = await parent();
    const participantKey = participantRandomizationKey(expState);

    const standardCloze: ClozePageItem[] = clozeQuestionSources.map((source) => ({
        kind: "standard",
        question: buildClozeQuestion(source, participantKey),
    }));
    const outcomePoints = buildOutcomePointsCloze(participantKey);
    const clozeQuestionData: ClozePageItem[] = [
        ...standardCloze,
        {
            kind: "outcome-points",
            question: outcomePoints.question,
            scenario: outcomePoints.scenario,
        },
    ];

    return { clozeQuestionData };
};

export const actions = {
    requestNextPageCookie: async (
        { cookies }: { cookies: Cookies },
    ) => {
        const complete: PageName[] = ["game_description_1"];
        const grant: PageName[] = ["game_description_2"];
        const revoke: PageName[] = [];
        const { expState } = await setNextPageCookie(cookies, complete, grant, revoke);
        return { expState };
    },
};
