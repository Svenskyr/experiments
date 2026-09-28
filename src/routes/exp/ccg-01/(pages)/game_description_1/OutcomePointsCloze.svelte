<script lang="ts">
import ClozeQuestion from "$lib/common/QuestionTypes/ClozeQuestion/v1/ClozeQuestion.svelte";
import PayoffNormalFormTable from "$lib/exp/games/ccg/v3/game/PayoffNormalFormTable.svelte";
import type { ClozeQuestionIR } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import type { OutcomePointsScenario } from "./outcomePointsCloze.ts";

let {
    question,
    scenario,
    complete = $bindable(false),
}: {
    question: ClozeQuestionIR;
    scenario: OutcomePointsScenario;
    complete?: boolean;
} = $props();
</script>

<div
    class="outcome-points-cloze"
    style:--cloze-color-first={scenario.actions[0].color}
    style:--cloze-color-second={scenario.actions[1].color}
>
    <p class="scenario-intro">
        The table shows payoffs for one example round with two colors. Your payoff is the
        <span class="your-payoff-emphasis">underlined</span> number in each cell.
    </p>
    <div class="payoff-table-container">
        <PayoffNormalFormTable actions={scenario.actions} outcomes={scenario.outcomes} />
    </div>
    <ClozeQuestion {question} bind:complete={complete} />
</div>

<style>
.payoff-table-container {
    align-self: center;
}
.outcome-points-cloze {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-block: 1rem;
}

.scenario-intro {
    margin: 0;
}

.your-payoff-emphasis {
    text-decoration-line: underline;
}

.outcome-points-cloze :global(.cloze-color-swatch) {
    display: inline-flex;
    aspect-ratio: 1 / 1;
    width: 1.5em;
    height: 1.5em;
    vertical-align: middle;
    margin-inline: 0.15rem;
    border: solid black 2px;
    border-radius: 22%;
    box-sizing: border-box;
}

.outcome-points-cloze :global(.cloze-color-swatch[data-slot="first"]) {
    background-color: var(--cloze-color-first);
}

.outcome-points-cloze :global(.cloze-color-swatch[data-slot="second"]) {
    background-color: var(--cloze-color-second);
}
</style>
