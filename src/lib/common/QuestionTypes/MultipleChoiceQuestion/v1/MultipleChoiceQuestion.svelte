<!-- Todo: Investigate if fieldset is desirable. -->

<script lang="ts">
import { PUBLIC_ENV } from "$env/static/public";
import { onMount } from "svelte";
import {
    constructQuestionObject,
    type MultipleChoiceQuestion,
    restoreClientResponses,
    storeClientResponses,
} from "./MultipleChoiceQuestion.ts";

let { props, bindableCompleted = $bindable(false) }: {
    props: MultipleChoiceQuestion;
    bindableCompleted: boolean;
} = $props();
let questionObject = $state<MultipleChoiceQuestion | null>(null);
import debugLib from "debug";
const debug = $derived(debugLib(`ccg-01:MCQ:${props.data.qid}`));

// trueResponses can technically be derived from props, but I'm not sure how that affects references.
const trueResponses = $derived(questionObject?.data.responses.filter((r) => r.isTrue));
const selectedResponses = $derived(
    questionObject?.data.responses.filter((r) => r.isSelected),
);
const everSelectedResponses = $derived(
    questionObject?.data.responses.filter((r) => r.wasEverSelected),
);
const allCorrectAreSelected: boolean = $derived(
    trueResponses?.every((r) => r.isSelected) ?? false,
);
const noIncorrectAreSelected: boolean = $derived(
    selectedResponses?.every((r) => r.isTrue !== false) ?? true,
);
const questionIsComplete: boolean = $derived.by(() => {
    if (!questionObject) return false;
    if (!questionObject.data.required) return true;
    if (!questionObject.data.showFeedback) return selectedResponses!.length >= 1;
    return allCorrectAreSelected && noIncorrectAreSelected;
});

onMount(() => {
    questionObject = constructQuestionObject(props);
    questionObject = restoreClientResponses(questionObject);
});

$effect(() => {
    if (questionObject) {
        storeClientResponses(questionObject);
        bindableCompleted = questionIsComplete;
    }
});

function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const selectedOptionText = target.value;
    const selected = target.checked;
    const displayIndex = target.id.split(":").pop();
    debug(
        `handleChange: Checked: ${selected} for ${selectedOptionText} at displayIndex: ${displayIndex}`,
    );
    debug(`Selected responses: ${JSON.stringify(selectedResponses)}`);

    // Update the target's status in the questionObject's responses array.
    questionObject!.data.responses[Number(displayIndex) - 1].isSelected = selected;
    questionObject!.data.responses[Number(displayIndex) - 1].wasEverSelected = true;

    // If radio, update all other responses.isSelected to false.
    if (questionObject?.data.inputType === "radio") {
        for (let i = 0; i < questionObject!.data.responses.length; i++) {
            if (i !== Number(displayIndex) - 1) {
                questionObject!.data.responses[i].isSelected = false;
            }
        }
    }
}

function handleReset(e: Event) {
    e.preventDefault();
    questionObject!.data.responses.forEach((response) => {
        response.isSelected = false;
        response.wasEverSelected = false;
    });
}
</script>

<form class="exp-question multiple-choice-question">
    <span class="question-text">{@html questionObject?.data.questionText}</span>
    {#if questionObject?.data.allowReset}
        <button class="reset-button" onclick={(e) => handleReset(e)}>Reset</button>
    {/if}
    {#each questionObject?.data.responses as response (response.displayIndex)}
        {@const responseId = `${questionObject?.data.qid}:${response.displayIndex}`}
        <label
            for={responseId}
            class="mcq-response-option"
            class:correct={questionObject?.data.showFeedback && response.isTrue && response.isSelected}
            class:incorrect={questionObject?.data.showFeedback && !response.isTrue && response.wasEverSelected}
            class:disabled={questionObject?.data.showFeedback &&
                    (response.isTrue && response.isSelected) ||
                (allCorrectAreSelected && !response.isSelected) ||
                (!response.isTrue && response.wasEverSelected && !response.isSelected)}
        >
            <input
                id={responseId}
                checked={response.isSelected}
                type={questionObject?.data.inputType}
                name={questionObject?.data.qid}
                value={response.optionText}
                onchange={handleChange}
            />
            <span class="response-option-text">{@html response.optionText}</span>
        </label>
    {/each}
</form>

<style>
:root {
    --color-default: oklch(0.80 0 0);
    --color-incomplete: oklch(0.85 0.2 100);
    --color-answered: oklch(0.80 0.5 240);
    --color-correct: oklch(0.80 0.5 170);
    --color-incorrect-selected: oklch(0.7 0.2 20 / 1);
    --color-incorrect-disabled: oklch(0.7 0.2 20 / 0.5);
}

.exp-question {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.question-text {
    font-size: 1.2rem;
}

.reset-button {
    padding: 0.25em 0.5em;
    margin: 0.25em;
    width: fit-content;
    align-self: center;
}

.mcq-response-option {
    font-size: 1.1rem;
    padding: 0.25em 0.5em;
    margin-left: 1em;
    border-radius: 0.5rem;
    user-select: none;
    &:hover {
        background-color: light-dark(oklch(0.8 0 0), oklch(0.4 0 0));
    }
    &.correct {
        background-color: var(--color-correct);
        opacity: 1.0;
    }
    &.incorrect {
        background-color: var(--color-incorrect-selected);
        &:hover {
            background-color: var(--color-incorrect-disabled);
        }
        &.disabled {
            background-color: var(--color-incorrect-disabled);
        }
    }
    &.disabled {
        pointer-events: none;
    }

    &.disabled:not(.correct) {
        opacity: 0.5;
    }
}
</style>
