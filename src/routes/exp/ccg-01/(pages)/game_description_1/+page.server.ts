import type { Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { multipleChoiceQuestions } from "./questions.ts";
import { setNextPageCookie } from "../../_state/Server.ts";
import {
    MultipleChoiceQuestion,
    resolveDisplayOrder,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

import type { PageName } from "../../_state/Pages.ts";

export const load: PageServerLoad = async ({ parent }) => {
    const { expState } = await parent();

    /* Load data must be serializable, so we can't instantiate the class here.
    Instead, we insert the randSeed, shuffle the items,
    and return the questions as props so the page can instantiate the class. */

    // const mcqProps: MultipleChoiceQuestionInterface[] = multipleChoiceQuestions.map((question) => {
    //     return {
    //         ...question,
    //         randSeed: `${expState.user.authUserId}-${question.qid}`,
    //         items: resolveDisplayOrder(
    //             question.items,
    //             `${expState.user.authUserId}-${question.qid}`,
    //         ),
    //     };
    // });

    const canonicalQuestionData: MultipleChoiceQuestion[] = multipleChoiceQuestions.map((
        question,
    ) => MultipleChoiceQuestion({
        ...question,
        randSeed: `${expState.user.authUserId}-${question.qid}`,
        canonicalItems: resolveDisplayOrder(
            question.canonicalItems,
            `${expState.user.authUserId}-${question.qid}`,
        ),
    }) as MultipleChoiceQuestion);

    return { canonicalQuestionData };
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
