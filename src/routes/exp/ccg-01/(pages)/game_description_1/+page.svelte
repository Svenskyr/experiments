<script lang="ts">
/* General */
import { dev } from "$app/environment";
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+game_description_1").debug;
import FeedbackWrapper from "$exp/ccg-01/_components/FeedbackWrapper.svelte";

/* expState */
import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

/* SyncHandler */
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
let syncHandler = $state(getSyncHandler());

/* Page questions */
import {
    load as loadMCQData,
    save as saveMCQData,
    sync as syncMCQData,
} from "$exp/ccg-01/_database/ComprehensionQuestionDBM.ts";
import {
    isQuestionComplete,
    mergeQuestionData,
    type MultipleChoiceQuestion as MCQ,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.js";
import MultipleChoiceQuestion from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.svelte";

let { data } = $props();
const { canonicalQuestionData } = $derived(data);
const questions: MCQ[] = $state(canonicalQuestionData);

import { browser } from "$app/environment";
if (browser) {
    for (const question of questions) {
        const storedData = loadMCQData(question.qid);
        if (storedData) {
            mergeQuestionData(question, storedData);
        }
    }
}

/* Page navigation */
import { requestNextPageCookie } from "$exp/ccg-01/_state/Client.ts";
import { goto } from "$app/navigation";
import NavigationBarWrapper from "$exp/ccg-01/_components/NavigationBarWrapper.svelte";

let pageCompleted = $derived(questions.every((question) => isQuestionComplete(question)));
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

import DemoGame from "$exp/ccg-01/_components/ColorCoordinationGame/DemoGame.svelte";
</script>

<div class="page-block">
    <h1>Game description</h1>

    <h3>You will play a <strong>coordination game</strong> with other participants.</h3>

    <ul>
        <li>
            You will play multiple <em>game rounds</em>. Each game round has the same setup but
            different details.
        </li>
        <li>
            Each game round has <strong>two players</strong>: you, and another random participant.
        </li>
        <li>
            Each game round has <strong>two options</strong> to choose from. You will each select
            <strong>one</strong> of these options.
        </li>
        <li>
            If you both select the <strong>same option</strong>, you both win points. If you select
            <strong>different options</strong>, you don't win points.
        </li>
        <li>
            Successful coordination on the <strong>first option</strong> will give <strong
            >you</strong>
            more points. Successful coordination on the <strong>second option</strong> will give
            <strong>the other player</strong> more points.
        </li>
    </ul>

    <h2>Example game</h2>

    <DemoGame {expState} showPredictionControls={false} />
    <FeedbackWrapper page="game_description_1" label="game description" />
</div>
<div class="page-block">
    {#each questions as question}
        <MultipleChoiceQuestion
            question={question}
            save={saveMCQData}
            sync={(question) => syncMCQData(syncHandler, question.qid)}
        />
    {/each}

    <FeedbackWrapper page="game_description_1" label="comprehension questions" />

</div>

<NavigationBarWrapper {pageCompleted} />

{#if !pageCompleted}
    <p>Please complete all questions before continuing.</p>
    <ul class="question-status-list">
        {#each questions as question (question.qid)}
            {const complete = $derived(isQuestionComplete(question))}
            <li class:complete={complete} class:incomplete={!complete}>{question.questionText}</li>
        {/each}
    </ul>
{/if}

{#if dev}
    <button onclick={async () => {
        await requestNextPageCookie(expState);
        goto("game_description_2");
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
