import { multipleChoiceQuestions, rangeSetQuestions } from "./questions.ts";
import {
    MultipleChoiceQuestion,
    resolveDisplayOrder as resolveMcqDisplayOrder,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import {
    newRangeSetQuestion,
    resolveDisplayOrder,
} from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.ts";
import type { PageServerLoad } from "./$types";
import { setStateCookie, STATE_COOKIE_NAME, verifyStateCookie } from "$exp/ccg-01/_state/Cookie.ts";
import type { PageState } from "$exp/ccg-01/_state/Pages.ts";
import type { Cookies } from "@sveltejs/kit";
import { fail, redirect } from "@sveltejs/kit";
import { upsertSurveyResponses, validateAndPrepareSurvey } from "$exp/ccg-01/_database0/survey.ts";
import { supabaseServiceRole } from "$exp/ccg-01/_database0/ServiceRole.svelte.ts";
import { setNextPageCookie } from "$exp/ccg-01/_state/Server.ts";
import type { PageName } from "$exp/ccg-01/_state/Pages.ts";
import { getLogger } from "$lib/server/logger.server.ts";
// const surveyQuestions = Object.values(rangeSetQuestions);

export const load: PageServerLoad = async ({ parent }) => {
    const { expState } = await parent();

    const questions = rangeSetQuestions.map((question) =>
        newRangeSetQuestion({
            ...question,
            randSeed: `${expState.user.authUserId}-${question.qid}`,
            canonicalItems: resolveDisplayOrder(
                question.canonicalItems,
                `${expState.user.authUserId}-${question.qid}`,
            ),
        })
    );

    const mcqQuestions = multipleChoiceQuestions.map((question) =>
        MultipleChoiceQuestion({
            ...question,
            randSeed: `${expState.user.authUserId}-${question.qid}`,
            canonicalItems: resolveMcqDisplayOrder(
                question.canonicalItems,
                `${expState.user.authUserId}-${question.qid}`,
            ),
        }) as MultipleChoiceQuestion
    );

    return { rangeSetQuestions: questions, multipleChoiceQuestions: mcqQuestions };
};

export const actions = {
    requestNextPageCookie: async (
        { cookies }: { cookies: Cookies },
    ) => {
        const complete: PageName[] = ["survey"];
        const grant: PageName[] = ["end"];
        const revoke: PageName[] = [];
        const { expState } = await setNextPageCookie(cookies, complete, grant, revoke);
        const log = getLogger({ mod: "exp/ccg-01/survey/" });
        void supabaseServiceRole
            .schema("exp_ccg_01")
            .rpc("complete_experiment_session", {
                p_session_id: expState.session.sessionId,
            })
            .then(({ error: rpcError }) => {
                if (rpcError) {
                    log.error({ rpcError }, "Failed to complete experiment session");
                } else {
                    log.info(
                        { sessionId: expState.session.sessionId },
                        "Experiment session completed",
                    );
                }
            });

        return { expState };
    },
};
