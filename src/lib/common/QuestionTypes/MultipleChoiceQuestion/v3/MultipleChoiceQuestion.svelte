<script lang="ts">
import type { MultipleChoiceQuestionClass } from "./MultipleChoiceQuestion.svelte.ts";
import DOMPurify from "dompurify";

let { question }: { question: MultipleChoiceQuestionClass } = $props();
</script>

<form class="multiple-choice-question-form">
    <fieldset class="response-items-fieldset">
        <legend class="legend-text">{@html question.questionText}</legend>
        {#if question.allowReset}
            <button type="button" class="reset-button" onclick={(e) => {
                e.preventDefault();
                question.reset();
            }}>Reset</button>
        {/if}
        <div class="response-items-container">
        {#each question.items as item (item.itemId)}
            <!-- {@const itemId = `${question.qid}-${item.itemId}`}
            {@const             correct = question.required === "all" && item.isTrue === true &&
                item.isSelected}
            {@const             incorrect = question.required === "all" && item.isTrue === false &&
                item.isSelected}
            {@const             corrected = question.required === "all" && item.isTrue === false &&
                item.wasSelected && !item.isSelected}
            {@const             disabled = question.required === "all" &&
                (correct || corrected || question.isComplete)} -->

            {const itemId = `${question.qid}-${item.itemId}`}
            {const             correct: boolean = $derived(question.required === "all" && item.isTrue === true &&
                item.isSelected)}
            {const             incorrect: boolean = $derived(question.required === "all" && item.isTrue === false &&
                item.isSelected)}
            {const             corrected: boolean = $derived(question.required === "all" && item.isTrue === false &&
                item.wasSelected && !item.isSelected)}
            {const             disabled: boolean = $derived(question.required === "all" &&
                (correct || corrected || question.isComplete))}
            <!-- Edge case: If a user item is added, then disabled state is incorrectly calculated as false. However, these settings should never be used at the same time. -->

            <div class="mcq-response-item">                
                <label for={itemId} class="mcq-response-item-label" class:correct class:incorrect class:corrected class:disabled>
                    <input
                        id={itemId}
                        name={question.qid}
                        type={question.inputType}
                        value={itemId}
                        checked={item.isSelected}
                        onchange={(e) => {
                            const selected = (e.currentTarget as HTMLInputElement).checked;
                            question.selectItem(item.itemId, selected);
                        }}
                    />
                    <span class="mcq-response-item-text">
                        {@html item.itemText}
                    </span>
                </label>
                {#if item.itemId.startsWith("user-")}
                    <button
                        type="button"
                        class="delete-user-item-button"
                        aria-label="Delete this user-provided item"
                        onclick={() => {
                            question.deleteUserItem(item.itemId);
                        }}
                    >
                    </button>
                {/if}
            </div>
        {/each}
        {#if question.allowUserItems}
            {let userItemInput: string = $state('')}
            {let addingUserItem: boolean = $state(false)}
            <div class="new-user-item-container">
                {#if !addingUserItem}
                    <button
                    type="button"
                        class="new-user-item-button exp-default-button"
                        aria-label="Add a new item"
                        onclick={() => {                            
                            addingUserItem = true;
                        }}
                    >
                        +
                    </button>
                {:else}
                    <button
                    type="button"
                        class="new-user-item-cancel-button"
                        aria-label="Cancel adding a new item"
                        onclick={() => {
                            userItemInput = "";
                            addingUserItem = false;
                        }}
                    >
                    </button>
                    <input
                        type="text"
                        id={`${question.qid}-new-user-item-input`}
                        placeholder="Add a new item..."
                        class="new-user-item-input"
                        size={Math.max(Math.min(userItemInput.length, 40), 10)}
                        bind:value={userItemInput}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                userItemInput = DOMPurify.sanitize(userItemInput).trim();
                                if (userItemInput.length === 0) {
                                    addingUserItem = false;
                                    return;
                                }
                                if (question.items.some((item) => item.itemText === userItemInput)) {
                                    addingUserItem = false;
                                    return;
                                }
                                question.addUserItem(userItemInput);
                                userItemInput = "";
                                addingUserItem = false;
                            }
                        }}
                    />
                    {#if                 userItemInput.length > 0}
                    {#if !question.items.some((item) => item.itemText === userItemInput)}
                        <button
                            type="button"
                            class="new-user-item-confirm-button exp-default-button"
                            aria-label="Submit a new item"
                            onclick={() => {
                                userItemInput = DOMPurify.sanitize(userItemInput).trim();
                                if (userItemInput.length === 0) {
                                    addingUserItem = false;
                                    return;
                                }
                                if (question.items.some((item) => item.itemText === userItemInput)) {
                                    addingUserItem = false;
                                    return;
                                }
                                question.addUserItem(userItemInput);
                                userItemInput = "";
                                addingUserItem = false;
                            }}
                        >
                            ✓
                        </button>
                        {:else}
                        <span class="new-user-item-error-message">Item already exists</span>
                        {/if}
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
    </fieldset>
</form>

<!-- <pre>{JSON.stringify(question, null, 2)}</pre> -->
<!-- <pre>{JSON.stringify(question.items, null, 2)}</pre> -->

<style>
.response-items-fieldset {
    display: flow-root;
}

.legend-text {
    font-size: 1.2em;
    padding: 0 0.25em;
}

.reset-button {
    float: right;
}

.response-items-container {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
}

.mcq-response-item {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
    max-width: 100%;
    align-items: center;
}

.mcq-response-item-label {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
    align-items: center;
    width: fit-content;
    padding: 0.25em 0.5em;
    border-radius: 0.5em;
    user-select: none;
    &:hover {
        background-color: light-dark(oklch(0.8 0 0), oklch(0.4 0 0));
    }
    &.correct {
        color: black;
        background-color: oklch(0.80 0.5 170);
        opacity: 1.0;
    }
    &.incorrect {
        background-color: oklch(0.7 0.2 20 / 1);
        &:hover {
            background-color: oklch(0.7 0.2 20 / 0.5);
        }
    }
    &.corrected {
        background-color: oklch(0.7 0.2 20 / 0.5);
        opacity: 0.5;
    }
    &.disabled {
        pointer-events: none;
    }

    &.disabled:not(.correct) {
        opacity: 0.5;
    }
}

.mcq-response-item-text {
    overflow-wrap: anywhere;
    word-break: break-word;
}

.new-user-item-container {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
    align-items: center;
    padding: 0.25em 0.15em;
    justify-content: center;
}

.new-user-item-button {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.25em;
    font-weight: bold;
    width: 1.25em;
    height: 1.25em;
    padding: 0;
}

.new-user-item-confirm-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 1lh;
    height: 1lh;
    padding: 0;
    font-size: 1.25em;
    font-weight: bold;
}

.new-user-item-cancel-button,
.delete-user-item-button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    width: 1.25em;
    height: 1.25em;
    text-align: center;
    background: none;
    background-color: transparent;
    border: none;
    &:hover:not(.disabled) {
        &::before {
            content: "❌";
        }
    }
    &::before {
        content: "✕";
    }
}

.new-user-item-error-message {
    color: red;
    font-size: 0.8em;
}
</style>
