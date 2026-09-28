<script lang="ts">
/* General */
import { dev } from "$app/environment";
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+game_description_2").debug;
import FeedbackWrapper from "$exp/ccg-01/_components/FeedbackWrapper.svelte";

/* expState */
import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

/* Page questions */
import ClozeQuestion from "$lib/common/QuestionTypes/ClozeQuestion/v1/ClozeQuestion.svelte";
import type { ClozePageItem } from "./+page.server.ts";

let { data } = $props();
const { clozeQuestionData } = $derived(data);

function initialClozeCompletion(items: ClozePageItem[]): Record<string, boolean> {
    return Object.fromEntries(items.map((item) => [item.question.qid, false]));
}

let clozeCompleteByQid = $state(initialClozeCompletion(data.clozeQuestionData));

/* Page navigation */
import { requestNextPageCookie } from "../../_state/Client.ts";
import { goto } from "$app/navigation";
import NavigationBarWrapper from "$exp/ccg-01/_components/NavigationBarWrapper.svelte";

let pageCompleted = $derived(
    clozeQuestionData.length > 0
        && clozeQuestionData.every((item) => clozeCompleteByQid[item.question.qid] === true),
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

import DemoGame from "$exp/ccg-01/_components/ColorCoordinationGame/DemoGame.svelte";

import "katex/dist/katex.min.css";
import katex from "katex";

function latex(node: HTMLElement, formula: string) {
    katex.render(formula, node, {
        throwOnError: false,
        displayMode: node.tagName === "DIV",
    });
}
</script>

<div class="page-block">
    <h1>Your predictions</h1>

    <p>
        For each game round, you'll be asked to predict the proportion of players that choose each
        option.
    </p>

    <ul>
        <li>Each prediction gives you a chance to earn a <em>prediction bonus</em>.</li>
        <li>
            The more accurate your predictions, the higher your chances of earning these bonuses.
        </li>
        <li>You will maximize your expected bonus payments by reporting your true predictions.</li>
        <li>You should <em>not</em> try to hedge your predictions in either direction.</li>
    </ul>

    <details>
        <summary>How are prediction bonuses rewarded?</summary>

        Prediction bonuses are rewarded using a <em>binarized scoring rule</em>. For each
        prediction, your chance of earning the bonus depends on the <em>difference between your
            prediction and the true value</em>. The closer your prediction, the greater your chance
        of earning the bonus.

        <h3>Scoring rule</h3>

        Let <span use:latex={"θ"}></span> be the true proportion of players that choose option 1,
        and
        <span use:latex={"x_i"}></span> be your prediction for that round.

        <!-- This line works as intended -->
        <div use:latex={"\\text{Probability of earning bonus: } p = 10\\% - (θ - x_i)^2"}></div>

        <!-- This line works as intended -->
        <!-- Probability of earning bonus <span use:latex={"= 10\\\% - (θ - x_i)^2"}></span> -->

        <div use:latex={"\\text{Expected payoff: } E[π_i] = p \\cdot b = 10\\% - (θ - x_i)^2"}>
        </div>

        <div
            use:latex={"\\text{First order condition: } \\frac{∂E[π_i]}{∂x_i} = 2 \\cdot (θ - x_i) = 0"}
        >
        </div>

        <div use:latex={"\\text{Best response: } x_i = θ"}></div>
    </details>

    <br>

    <DemoGame {expState} showPredictionControls={true} />

    <FeedbackWrapper page="game_description_2" label="game predictions" />
</div>
<div class="page-block">
    <h2>Comprehension questions</h2>

    {#each clozeQuestionData as item (item.question.qid)}
        <ClozeQuestion
            question={item.question}
            bind:complete={clozeCompleteByQid[item.question.qid]}
        />
    {/each}

    <FeedbackWrapper page="game_description_2" label="cloze questions" />
</div>

<NavigationBarWrapper {pageCompleted} />

{#if !pageCompleted}
    <p>Please complete all questions before continuing.</p>
    <ul class="question-status-list">
        {#each clozeQuestionData as item (item.question.qid)}
            {@const complete = clozeCompleteByQid[item.question.qid] === true}
            <li class:complete class:incomplete={!complete}>{item.question.label}</li>
        {/each}
    </ul>
{/if}

{#if dev}
    <button onclick={async () => {
        await requestNextPageCookie(expState);
        goto("game_play");
    }}>Skip</button>
{/if}

<style>
details {
    &[open]::details-content {
        background-color: light-dark(oklch(90% 0 0), oklch(30% 0 0));
        border-radius: 1rem;
    }
}
.question-status-list li.incomplete::marker {
    content: "❌ ";
}

.question-status-list li.complete::marker {
    content: "✅ ";
}
</style>
