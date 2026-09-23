<script lang="ts">
/* General */
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+survey").debug;
import { dev } from "$app/environment";
import FeedbackWrapper from "$exp/ccg-01/_components/FeedbackWrapper.svelte";

/* expState */
import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

/* syncHandler */
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
const syncHandler = getSyncHandler();

/* Page questions */
import {
    load as loadRangeSetData,
    save as saveRangeSetData,
    sync as syncRangeSetData,
} from "$exp/ccg-01/_database/RangeSetQuestionDBM.ts";
import {
    load as loadMcqData,
    save as saveMcqData,
    sync as syncMcqData,
} from "$exp/ccg-01/_database/SurveyMultipleChoiceQuestionDBM.ts";
import {
    isQuestionComplete as isRangeSetComplete,
    newRangeSetQuestion,
    type RangeSetQuestion as RSQ,
} from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.js";
import {
    isQuestionComplete as isMcqComplete,
    type MultipleChoiceQuestion as MCQ,
    newMultipleChoiceQuestion,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.js";
import RangeSetQuestion from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.svelte";
import MultipleChoiceQuestion from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.svelte";

let { data } = $props();
const { rangeSetQuestions, multipleChoiceQuestions } = $derived(data);

const rangeSetQuestionState: RSQ[] = $state(
    rangeSetQuestions.map((q) =>
        newRangeSetQuestion(
            {
                ...q,
                canonicalItems: q.canonicalItems.map((item) => ({ ...item })),
            },
            loadRangeSetData(q.qid) ?? undefined,
        )
    ),
);

const mcqQuestionState: MCQ[] = $state(
    multipleChoiceQuestions.map((q) =>
        newMultipleChoiceQuestion(
            {
                ...q,
                canonicalItems: q.canonicalItems.map((item) => ({ ...item })),
            },
            loadMcqData(q.qid) ?? undefined,
        )
    ),
);

/* Page navigation */
import { requestNextPageCookie } from "$exp/ccg-01/_state/Client.ts";
import { goto } from "$app/navigation";
import NavigationBarWrapper from "$exp/ccg-01/_components/NavigationBarWrapper.svelte";

let pageCompleted = $derived(
    rangeSetQuestionState.every((question) => isRangeSetComplete(question))
        && mcqQuestionState.every((question) => isMcqComplete(question)),
);
$effect(() => {
    if (pageCompleted) {
        (async () => {
            const { error } = await requestNextPageCookie(expState);
            if (error) {
                console.error(`error requesting next page cookie: ${JSON.stringify(error)}`);
            }
        })();
    }
});
</script>


<div class="page-block center-content">
    <h1>Exit Survey</h1>

    <h2>These questions are about <strong>your</strong> beliefs or opinions.</h2>
</div>

{#each rangeSetQuestionState as question (question.qid)}
    <div class="page-block center-content">
    <RangeSetQuestion
        {question}
        save={saveRangeSetData}
        sync={(question) => syncRangeSetData(syncHandler, question.qid)} />
    <FeedbackWrapper page="survey" label={question.qid} />
</div>
{/each}

{#each mcqQuestionState as question (question.qid)}
    <div class="page-block">
    <MultipleChoiceQuestion
        {question}
        save={saveMcqData}
        sync={(q) => syncMcqData(syncHandler, q.qid)}
    />
    <FeedbackWrapper page="survey" label={question.qid} />
</div>
{/each}

<NavigationBarWrapper {pageCompleted} />

{#if !pageCompleted}
    <p>Please complete all questions before continuing.</p>
    <ul class="question-status-list">
        {#each rangeSetQuestionState as question (question.qid)}
            {const complete = $derived(isRangeSetComplete(question))}
            <li class:complete={complete} class:incomplete={!complete}>{question.questionText}</li>
        {/each}
        {#each mcqQuestionState as question (question.qid)}
            {const complete = $derived(isMcqComplete(question))}
            <li class:complete={complete} class:incomplete={!complete}>{@html question.questionText}</li>
        {/each}
    </ul>
{/if}

{#if dev}
    <button onclick={async () => {
        await requestNextPageCookie(expState);
        goto("end");
    }}>Skip</button>
{/if}

<style>
.question-status-list li.incomplete::marker {
    content: "❌ ";
}

.question-status-list li.complete::marker {
    content: "✅ ";
}
</style>
