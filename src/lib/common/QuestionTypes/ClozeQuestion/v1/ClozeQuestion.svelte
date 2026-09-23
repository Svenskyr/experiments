<script lang="ts">
import {
    blankHasCorrectMarker,
    type BlankNode,
    type ClozeBlankResponse,
    type ClozeContentNode,
    type ClozeQuestionIR,
    getBlanksFromQuestion,
    isBlankAnswered,
    isBlankCorrect,
    questionHasCheckableAnswers,
    type ResponseItem,
} from "./clozeQuestion.ts";
import { clientsideSanitize } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

let { question }: { question: ClozeQuestionIR } = $props();

let responses = $state<Record<string, ClozeBlankResponse>>({});
/** Per-blank responses as of the last "Check answers" click (correct blanks stay until recheck). */
let gradedResponses = $state<Record<string, ClozeBlankResponse> | null>(null);

const hasCheckableAnswers = $derived(questionHasCheckableAnswers(question));

const canCheckAnswers = $derived(
    getBlanksFromQuestion(question)
        .filter(blankHasCorrectMarker)
        .every((blank) =>
            isBlankAnswered(blank, responses[blank.blankId] ?? { selectedItemId: "", freeText: "" })
        ),
);

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

function handleCheckAnswers(): void {
    const snapshot: Record<string, ClozeBlankResponse> = {};
    for (const blank of getBlanksFromQuestion(question).filter(blankHasCorrectMarker)) {
        snapshot[blank.blankId] = { ...getResponse(blank.blankId) };
    }
    gradedResponses = snapshot;
}

function getResponse(blankId: string): ClozeBlankResponse {
    return responses[blankId] ?? { selectedItemId: "", freeText: "" };
}

function setSelectedItemId(blankId: string, selectedItemId: string): void {
    clearIncorrectGradingForBlank(blankId);
    responses = {
        ...responses,
        [blankId]: { ...getResponse(blankId), selectedItemId },
    };
}

function setFreeText(blankId: string, freeText: string): void {
    clearIncorrectGradingForBlank(blankId);
    responses = {
        ...responses,
        [blankId]: { ...getResponse(blankId), freeText: clientsideSanitize(freeText) },
    };
}

/** Plain text for native &lt;option&gt; (HTML in labels is not rendered there). */
function optionLabelText(label: string): string {
    const sanitized = clientsideSanitize(label);
    if (typeof document === "undefined") {
        return sanitized.replace(/<[^>]*>/g, "");
    }
    const el = document.createElement("div");
    el.innerHTML = sanitized;
    return el.textContent ?? "";
}

function choiceOptions(blank: BlankNode): ResponseItem[] {
    return blank.blankOptions.filter((item) => item.itemLabel !== undefined);
}

function freeTextOption(blank: BlankNode): ResponseItem | undefined {
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

/** Longest plain-text label; sizes the select via the hidden sizer span. */
function widestSelectLabel(blank: BlankNode): string {
    const labels = choiceOptions(blank).map((item) => optionLabelText(item.itemLabel!));
    if (freeTextOption(blank)) {
        labels.push("Other…");
    }
    return labels.reduce((widest, label) => (label.length > widest.length ? label : widest), "");
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
                    <span class="cloze-select-wrap">
                        <select
                            class="cloze-select"
                            class:correct
                            class:incorrect
                            aria-label={`Response for blank ${blank.blankId}`}
                            {disabled}
                            value={response.selectedItemId}
                            onchange={(e) => {
                                setSelectedItemId(
                                    blank.blankId,
                                    (e.currentTarget as HTMLSelectElement).value,
                                );
                            }}
                        >
                            <option value="" disabled hidden></option>
                            {#each choices as item (item.itemId)}
                                <option value={item.itemId}>{optionLabelText(item.itemLabel!)}</option>
                            {/each}
                            {#if free}
                                <option value={free.itemId}>Other…</option>
                            {/if}
                        </select>
                        <span class="cloze-select-sizer" aria-hidden="true">{widestSelectLabel(blank)}</span>
                    </span>
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
    {#if hasCheckableAnswers}
        <button
            type="button"
            class="check-answers-button exp-default-button"
            disabled={!canCheckAnswers}
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
    align-items: center;
    gap: 0.35rem;
    margin-inline: 0.15rem;
    vertical-align: baseline;
}

.cloze-select-wrap {
    display: inline-grid;
    max-width: 100%;
    vertical-align: baseline;
}

.cloze-select-wrap > .cloze-select,
.cloze-select-wrap > .cloze-select-sizer {
    grid-area: 1 / 1;
    font: inherit;
    line-height: inherit;
}

.cloze-select-sizer {
    visibility: hidden;
    white-space: nowrap;
    box-sizing: border-box;
    padding-inline: 0.35rem 1.5rem;
    border: 1px solid transparent;
    pointer-events: none;
}

.cloze-select,
.cloze-text-input {
    font: inherit;
    box-sizing: border-box;
    border: 1px solid light-dark(oklch(70% 0 0), oklch(45% 0 0));
    border-radius: 0.35rem;
}

.cloze-select {
    width: 100%;
    min-width: 0;
    padding-inline: 0.35rem 1.5rem;
    appearance: none;
    background-color: light-dark(oklch(100% 0 0), oklch(20% 0 0));
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath fill='%236b7280' d='M0 0h10L5 6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.45rem center;
    background-size: 0.55rem auto;
}

.cloze-text-input {
    max-width: min(100%, 16rem);
    min-width: 8rem;
    padding-inline: 0.35rem;
}

.cloze-select.correct,
.cloze-text-input.correct {
    background-color: oklch(0.8 0.5 170);
    color: inherit;
    opacity: 1;
}

.cloze-select.correct,
.cloze-select.incorrect {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath fill='%236b7280' d='M0 0h10L5 6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.45rem center;
    background-size: 0.55rem auto;
}

.cloze-select.correct:disabled {
    opacity: 1;
    color: black;
    -webkit-text-fill-color: currentColor;
}

.cloze-select.incorrect,
.cloze-text-input.incorrect {
    background-color: oklch(0.7 0.2 20 / 1);
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
