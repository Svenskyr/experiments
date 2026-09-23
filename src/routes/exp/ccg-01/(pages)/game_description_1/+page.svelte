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
import ClozeQuestion from "$lib/common/QuestionTypes/ClozeQuestion/v1/ClozeQuestion.svelte";

let { data } = $props();
const { canonicalQuestionData, clozeQuestionData } = $derived(data);
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
            You will play a series of <em>game rounds</em>. Each game round has the same basic setup, but each have different options or players.
        </li>
        <li>
            Each game round has <strong>two players</strong> (you and another participant).
        </li>
        <li>
            For each game round, a new participant is randomly selected to be the other player.
        </li>
        <li>
            "Other player" selection is individual, so just because you get matched with someone doesn't mean they'll get matched with you
            (they may get matched with someone else, and someone else may get matched with you).
        </li>
        <li>
            Each game round has <strong>two options</strong> to choose from. You each select
            <strong>one</strong> of these options.
        </li>
        <li>
            If you both select the <strong>same option</strong>, you win points. If you select
            <strong>different options</strong>, you don't win points.
        </li>
        <!-- <li>
            Successful coordination on the <strong>first option</strong> will give <strong
            >you</strong>
            more points. Successful coordination on the <strong>second option</strong> will give
            <strong>the other player</strong> more points.
        </li> -->
    </ul>

    <details>
        <summary>Other player selection details</summary>

        <p>Each game round has <b>four (4)</b> elements:</p>
        <ol>
            <li><em>Your</em> avatar</li>
            <li>The <em>other player's</em> avatar</li>
            <li>The option on your <em>left</em> (on the right for the other player)</li>
            <li>The option on your <em>right</em> (on the left for the other player)</li>
        </ol>

        <br>

        <p>For someone to be selected as the "other player" in one of <em>your</em> game rounds, they must have played the same game round as you, but from the <em>other player's perspective</em>.</p>

        <p>
            For example, suppose that you have avatar "A" and two other players (Bob and Charlie) both have avatar "B."
            You then play a game round where the other player has avatar "B."
        </p>

        <p>When the other player is selected for your game round, either Bob or Charlie could be selected (since they both have avatar "B").</p>

        <p>
            Now suppose that another player (Alice) also has avatar "A."
            For Bob and Charlie's game rounds, either you or Alice could be selected as the other player in <em>their</em> game round.</p>
        <p>
            Suppose that Bob is selected as the other player in <em>your</em> game round.
            Since all players are selected separately, this has no effect on who is selected for <em>Bob's</em> game round.
            Bob's game round could still be matched with either you or Alice, regardless of who <em>you</em> were matched with.
        </p>

        <p>This means that your choice directly affects <em>your</em> outcome and <em>probabilistically</em> affects the outcome of other players.</p>
    </details>

    <h2>Example game</h2>

    <DemoGame {expState} showPredictionControls={false} />
    <FeedbackWrapper page="game_description_1" label="game description" />
</div>
<div class="page-block">
    <h2>Comprehension questions</h2>

    <p>Note: I'm currently testing new cloze questions; these may replace the multiple choice questions below.</p>

    {#each clozeQuestionData as clozeQuestion (clozeQuestion.qid)}
        <ClozeQuestion question={clozeQuestion} />
    {/each}

    <FeedbackWrapper page="game_description_1" label="cloze questions" />
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
            <li class:complete={complete} class:incomplete={!complete}>{@html question.questionText}</li>
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
