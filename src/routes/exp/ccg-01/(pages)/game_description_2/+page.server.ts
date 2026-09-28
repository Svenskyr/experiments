import type { Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { setNextPageCookie } from "../../_state/Server.ts";

import type { PageName } from "../../_state/Pages.ts";
import {
    buildClozeQuestion,
    type ClozeQuestionIR,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import { clozeQuestionSources } from "./clozeSource.ts";
import { participantRandomizationKey } from "$exp/ccg-01/_state/ExperimentState.ts";

export type ClozePageItem = { kind: "standard"; question: ClozeQuestionIR };

export const load: PageServerLoad = async ({ parent }) => {
    const { expState } = await parent();
    const participantKey = participantRandomizationKey(expState);

    const clozeQuestionData: ClozePageItem[] = clozeQuestionSources.map((source) => ({
        kind: "standard",
        question: buildClozeQuestion(source, participantKey),
    }));

    return { clozeQuestionData };
};

export const actions = {
    requestNextPageCookie: async (
        { cookies }: { cookies: Cookies },
    ) => {
        const complete: PageName[] = ["game_description_2"];
        const grant: PageName[] = ["game_play"];
        const revoke: PageName[] = [];
        const { expState } = await setNextPageCookie(cookies, complete, grant, revoke);
        return { expState };
    },
};
