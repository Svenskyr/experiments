<script lang="ts">
import {
    blankHasCorrectMarker,
    type BlankNode,
    buildCheckLinesPayload,
    type ClozeBlankResponse,
    type ClozeContentNode,
    type ClozeLineCheckPayload,
    type ClozeQuestionIR,
    getBlanksFromQuestion,
    isBlankAnswered,
    isBlankCorrect,
    isClozeQuestionComplete,
    questionHasCheckableAnswers,
    recordBlankSelection,
} from "../v1/clozeQuestion.ts";
import { clientsideSanitize } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import ClozeBlankDropdown from "./ClozeBlankDropdown.svelte";

let {
    question,
    complete = $bindable(false),
    initialResponses = {},
    initialGradedResponses = null,
    onSaveBlank,
    onCheckAnswers,
}: {
    question: ClozeQuestionIR;
    complete?: boolean;
    initialResponses?: Record<string, ClozeBlankResponse>;
    initialGradedResponses?: Record<string, ClozeBlankResponse> | null;
    onSaveBlank?: (blankId: string, response: ClozeBlankResponse) => void;
    onCheckAnswers?: (
        linesPayload: ClozeLineCheckPayload[],
    ) => Promise<{
        error: string | null;
        blankCorrect: Record<string, boolean>;
        updatedResponses?: Record<string, ClozeBlankResponse>;
    }>;
} = $props();

let responses = $state<Record<string, ClozeBlankResponse>>({});
/** Per-blank responses as of the last "Check answers" click (correct blanks stay until recheck). */
let gradedResponses = $state<Record<string, ClozeBlankResponse> | null>(null);
let checkError = $state<string | null>(null);
let checking = $state(false);
let openBlankId = $state<string | null>(null);

$effect(() => {
    responses = { ...initialResponses };
});

$effect(() => {
    gradedResponses = initialGradedResponses && Object.keys(initialGradedResponses).length > 0
        ? { ...initialGradedResponses }
        : null;
});

const hasCheckableAnswers = $derived(questionHasCheckableAnswers(question));

const canCheckAnswers = $derived(
    getBlanksFromQuestion(question)
        .filter(blankHasCorrectMarker)
        .every((blank) =>
            isBlankAnswered(blank, responses[blank.blankId] ?? { selectedItemId: "", freeText: "" })
        ),
);

const questionComplete = $derived(isClozeQuestionComplete(question, gradedResponses));

$effect(() => {
    complete = questionComplete;
});

function clearIncorrectGradingForBlank(blankId: string): void {
    if (!gradedResponses || gradedResponses[blankId] === undefined) {
        return;
    }
    const blank = getBlanksFromQuestion(question).find((b) => b.blankId === blankId);
    if (!blank) {
        return;
    }
    const graded = gradedResponses[blankId];
    if (isBlankCorrect(blank, graded)) {
        return;
    }
    const next = { ...gradedResponses };
    delete next[blankId];
    gradedResponses = Object.keys(next).length > 0 ? next : null;
}

async function handleCheckAnswers(): Promise<void> {
    openBlankId = null;

    if (!onCheckAnswers) {
        const snapshot: Record<string, ClozeBlankResponse> = {};
        for (const blank of getBlanksFromQuestion(question).filter(blankHasCorrectMarker)) {
            snapshot[blank.blankId] = { ...getResponse(blank.blankId) };
        }
        gradedResponses = snapshot;
        return;
    }

    const linesPayload = buildCheckLinesPayload(question, responses);
    if (linesPayload.length === 0) {
        return;
    }

    checking = true;
    checkError = null;

    try {
        const result = await onCheckAnswers(linesPayload);
        if (result.error) {
            checkError = result.error;
            return;
        }

        if (result.updatedResponses) {
            responses = { ...result.updatedResponses };
        }

        const snapshot: Record<string, ClozeBlankResponse> = {};
        for (const blankId of Object.keys(result.blankCorrect)) {
            snapshot[blankId] = { ...getResponse(blankId) };
        }
        gradedResponses = Object.keys(snapshot).length > 0 ? snapshot : null;
    } finally {
        checking = false;
    }
}

function getResponse(blankId: string): ClozeBlankResponse {
    return responses[blankId] ?? { selectedItemId: "", freeText: "" };
}

function setSelectedItemId(blankId: string, selectedItemId: string): void {
    clearIncorrectGradingForBlank(blankId);
    const next = recordBlankSelection(getResponse(blankId), selectedItemId);
    responses = {
        ...responses,
        [blankId]: next,
    };
    onSaveBlank?.(blankId, next);
}

function setFreeText(blankId: string, freeText: string): void {
    clearIncorrectGradingForBlank(blankId);
    responses = {
        ...responses,
        [blankId]: { ...getResponse(blankId), freeText: clientsideSanitize(freeText) },
    };
    onSaveBlank?.(blankId, getResponse(blankId));
}

function choiceOptions(blank: BlankNode) {
    return blank.blankOptions.filter((item) => item.itemLabel !== undefined);
}

function freeTextOption(blank: BlankNode) {
    return blank.blankOptions.find((item) => item.itemLabel === undefined);
}

function isFreeTextActive(blank: BlankNode): boolean {
    const free = freeTextOption(blank);
    if (!free) {
        return false;
    }
    const response = getResponse(blank.blankId);
    if (choiceOptions(blank).length === 0) {
        return true;
    }
    return response.selectedItemId === free.itemId;
}

function setBlankOpen(blankId: string, open: boolean): void {
    openBlankId = open ? blankId : openBlankId === blankId ? null : openBlankId;
}
</script>

{#snippet renderLine(line: readonly ClozeContentNode[])}
    {#each line as node, index (index)}
        {#if node.type === "text"}
            {@html clientsideSanitize(node.text)}
        {:else}
            {@const blank = node}
            {@const choices = choiceOptions(blank)}
            {@const free = freeTextOption(blank)}
            {@const response = getResponse(blank.blankId)}
            {@const gradedResponse = gradedResponses?.[blank.blankId]}
            {@const gradable = blankHasCorrectMarker(blank)}
            {@const correct = gradedResponse !== undefined && gradable &&
                isBlankCorrect(blank, gradedResponse)}
            {@const incorrect = gradedResponse !== undefined && gradable &&
                isBlankAnswered(blank, gradedResponse) && !isBlankCorrect(blank, gradedResponse)}
            {@const disabled = correct}
            <span class="cloze-blank">
                {#if choices.length > 0}
                    <ClozeBlankDropdown
                        {blank}
                        {choices}
                        freeOption={free}
                        selectedItemId={response.selectedItemId}
                        {disabled}
                        {gradedResponse}
                        {correct}
                        {incorrect}
                        open={openBlankId === blank.blankId}
                        onOpenChange={(open) => setBlankOpen(blank.blankId, open)}
                        onSelect={(itemId) => setSelectedItemId(blank.blankId, itemId)}
                    />
                {/if}
                {#if isFreeTextActive(blank)}
                    <input
                        class="cloze-text-input"
                        class:correct
                        class:incorrect
                        type="text"
                        aria-label={`Free text for blank ${blank.blankId}`}
                        placeholder="Type your response here"
                        {disabled}
                        value={response.freeText}
                        oninput={(e) => {
                            setFreeText(
                                blank.blankId,
                                (e.currentTarget as HTMLInputElement).value,
                            );
                        }}
                    />
                {/if}
            </span>
        {/if}
    {/each}
{/snippet}

<fieldset class="cloze-question">
    <legend class="legend-text">{@html clientsideSanitize(question.label)}</legend>
    {#each question.lines as line, lineIndex (lineIndex)}
        <p class="cloze-content">{@render renderLine(line)}</p>
    {/each}
    {#if hasCheckableAnswers && !questionComplete}
        {#if checkError}
            <p class="check-error" role="alert">{checkError}</p>
        {/if}
        <button
            type="button"
            class="check-answers-button exp-default-button"
            disabled={!canCheckAnswers || checking}
            onclick={handleCheckAnswers}
        >
            Check answers
        </button>
    {/if}
</fieldset>

<style>
.cloze-question {
    border: 1px solid var(--color-border, #ccc);
    border-radius: 0.25rem;
    margin-block: 1rem;
    padding: 0.75rem 1rem;
}

.legend-text {
    font-size: 1.25rem;
    font-weight: 600;
    padding-inline: 0.25rem;
}

.cloze-content {
    line-height: 1.6;
    margin: 0;
}

.cloze-content + .cloze-content {
    margin-top: 0.5rem;
}

.cloze-blank {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem;
    margin-inline: 0.15rem;
    vertical-align: baseline;
}

.cloze-text-input {
    font: inherit;
    box-sizing: border-box;
    border: 1px solid light-dark(oklch(70% 0 0), oklch(45% 0 0));
    border-radius: 0.35rem;
    max-width: min(100%, 16rem);
    min-width: 8rem;
    padding-inline: 0.35rem;
}

.cloze-text-input.correct {
    background-color: oklch(0.8 0.5 170);
    color: inherit;
    opacity: 1;
}

.cloze-text-input.incorrect {
    background-color: oklch(0.7 0.2 20 / 1);
}

.check-error {
    margin: 0.75rem 0 0;
    color: light-dark(oklch(45% 0.2 25), oklch(75% 0.15 25));
    font-size: 0.95rem;
    text-align: center;
}

.check-answers-button {
    display: block;
    margin-top: 0.75rem;
    margin-inline: auto;
}

.check-answers-button:disabled {
    opacity: 0.5;
    cursor: default;
}
</style>
