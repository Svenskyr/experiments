<script lang="ts">
import { PUBLIC_ENV } from "$env/static/public";
import { onMount } from "svelte";
import { type MultipleChoiceItem, type MultipleChoiceQuestion } from "./MultipleChoiceQuestion.ts";
import DOMPurify from "dompurify";
let { boundQuestion = $bindable<MultipleChoiceQuestion>(), onCommit }: {
    boundQuestion: MultipleChoiceQuestion;
    onCommit?: (mcQuestion: MultipleChoiceQuestion) => void;
} = $props();
import debugLib from "debug";
const debug = $derived(debugLib(`ccg-01:MCQ:${boundQuestion?.qid}`));

// function handleChange(e: Event) {
//     const target = e.target as HTMLInputElement;
//     const selectedOptionText = target.value;
//     const selected = target.checked;
//     const displayIndex = target.id.split(":").pop();
//     debug(
//         `handleChange: Checked: ${selected} for ${selectedOptionText} at displayIndex: ${displayIndex}`,
//     );
//     debug(`Selected responses: ${JSON.stringify(selectedResponses)}`);

//     // Update the target's status in the questionObject's responses array.
//     questionObject!.data.responses[Number(displayIndex) - 1].isSelected = selected;
//     questionObject!.data.responses[Number(displayIndex) - 1].wasEverSelected = true;

//     // If radio, update all other responses.isSelected to false.
//     if (questionObject?.data.inputType === "radio") {
//         for (let i = 0; i < questionObject!.data.responses.length; i++) {
//             if (i !== Number(displayIndex) - 1) {
//                 questionObject!.data.responses[i].isSelected = false;
//             }
//         }
//     }
// }

// function handleReset(e: Event) {
//     e.preventDefault();
//     questionObject!.data.responses.forEach((response) => {
//         response.isSelected = false;
//         response.wasEverSelected = false;
//     });
// }

const itemStates = $derived(boundQuestion.items.map((item) => ({
    itemId: item.itemId,
    isSelected: item.isSelected,
    wasSelected: item.wasSelected,
    isTrue: item.isTrue,
})));
const questionIsComplete = $derived(() => {
    return false;
});
</script>

<form class="multiple-choice-question-form">
    <fieldset>
        <legend class="legend-text">{boundQuestion.questionText}</legend>
        {#each boundQuestion.items as item (item.itemId)}
            {@const itemId = `${boundQuestion.qid}-${item.itemId}`}
            {@const             correct = boundQuestion.showFeedback && (item.isTrue === true) &&
                item.isSelected}
            {@const             incorrect = boundQuestion.showFeedback && (item.isTrue === false) &&
                item.isSelected}
            {@const             corrected = boundQuestion.showFeedback && (item.isTrue === false) &&
                item.wasSelected &&
                !item.isSelected}
            {@const             disabled = boundQuestion.showFeedback &&
                (correct || corrected || questionIsComplete())}
            <div
                class="mcq-response-item"
                class:correct
                class:incorrect
                class:corrected
                class:disabled
            >
                <input
                    id={itemId}
                    name={boundQuestion.qid}
                    type={boundQuestion.inputType}
                    value={itemId}
                    checked={item.isSelected ?? false}
                    onchange={(e) => {
                        const selected = (e.currentTarget as HTMLInputElement).checked;
                        item.isSelected = selected;
                        item.wasSelected = true;
                        if (boundQuestion.inputType === "radio") {
                            for (const otherItem of boundQuestion.items) {
                                if (otherItem.itemId !== item.itemId) {
                                    otherItem.isSelected = false;
                                }
                            }
                        }
                        debug(
                            `onchange: Checked: ${selected} for ${item.itemText}`,
                        );
                        localStorage.setItem(
                            boundQuestion.qid,
                            JSON.stringify(boundQuestion),
                        );
                        onCommit?.(boundQuestion);
                    }}
                />
                <label
                    for={itemId}
                >
                    {@html item.itemText}
                </label>
            </div>
        {/each}
    </fieldset>
</form>

<pre>itemStates: {JSON.stringify(itemStates, null, 2)}</pre>

<pre>questionIsComplete: {JSON.stringify(questionIsComplete(), null, 2)}</pre>
<pre>boundQuestion: {JSON.stringify(boundQuestion, null, 2)}</pre>
<!-- <form class="exp-question multiple-choice-question">
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
</form> -->

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

/* Multiple Choice Question */

.multiple-choice-question-form {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}

.legend-text {
    font-size: 1.2em;
    padding: 0 0.25em;
}

.mcq-response-item {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
    width: fit-content;
    padding: 0.25em 0.5em;
    margin: 0 1em;
    border-radius: 0.5em;
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
    &.corrected {
        background-color: var(--color-incorrect-disabled);
        opacity: 0.5;
    }
    &.disabled {
        pointer-events: none;
    }

    &.disabled:not(.correct) {
        opacity: 0.5;
    }
}
</style>
