<script lang="ts">
import ClozeQuestion from "$lib/common/QuestionTypes/ClozeQuestion/v2/ClozeQuestion.svelte";
import PayoffNormalFormTable from "$lib/exp/games/ccg/v3/game/PayoffNormalFormTable.svelte";
import type {
    ClozeAnswerGrading,
    ClozeBlankResponse,
    ClozeLineCheckPayload,
    ClozeQuestionIR,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import type { OutcomePointsScenario } from "./outcomePointsCloze.ts";

let {
    question,
    scenario,
    complete = $bindable(false),
    initialResponses = {},
    initialCheckedBlankIds = [],
    initialGradedResponses = null,
    onCheckAnswers,
    grading = "local",
}: {
    question: ClozeQuestionIR;
    scenario: OutcomePointsScenario;
    grading?: ClozeAnswerGrading;
    complete?: boolean;
    initialResponses?: Record<string, ClozeBlankResponse>;
    initialCheckedBlankIds?: readonly string[];
    initialGradedResponses?: Record<string, ClozeBlankResponse> | null;
    onCheckAnswers?: (
        linesPayload: ClozeLineCheckPayload[],
    ) => Promise<{ error: string | null; blankCorrect: Record<string, boolean> }>;
} = $props();
</script>

<div
    class="outcome-points-cloze"
    style:--cloze-color-first={scenario.actions[0].color}
    style:--cloze-color-second={scenario.actions[1].color}
>
    <p class="scenario-intro">
        This example payoff table is used for the following questions.
    </p>
    <div class="payoff-table-container">
        <PayoffNormalFormTable actions={scenario.actions} outcomes={scenario.outcomes} />
    </div>
    <ClozeQuestion
        {question}
        {grading}
        {initialResponses}
        {initialCheckedBlankIds}
        {initialGradedResponses}
        {onCheckAnswers}
        bind:complete={complete}
    />
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
    text-align: center;
    font-size: 1.1rem;
    margin-bottom: 1rem;
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
