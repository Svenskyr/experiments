import type { Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { multipleChoiceQuestions } from "./questions.ts";
import { setNextPageCookie } from "../../_state/Server.ts";
import {
    MultipleChoiceQuestion,
    resolveDisplayOrder,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import type { PageName } from "../../_state/Pages.ts";
import { questionRandSeed } from "$exp/ccg-01/_state/ExperimentState.ts";

export const load: PageServerLoad = async ({ parent }) => {
    const { expState } = await parent();

    const canonicalQuestionData: MultipleChoiceQuestion[] = multipleChoiceQuestions.map((
        question,
    ) => MultipleChoiceQuestion({
        ...question,
        randSeed: questionRandSeed(expState, question.qid),
        canonicalItems: resolveDisplayOrder(
            question.canonicalItems,
            questionRandSeed(expState, question.qid),
        ),
    }) as MultipleChoiceQuestion);

    return { canonicalQuestionData };
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
