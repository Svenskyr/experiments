<script lang="ts">
import type { RangeSetItem, RangeSetQuestion } from "./RangeSetQuestion.ts";
import {
    addUserItem,
    clientsideSanitize,
    getTicks,
    isQuestionComplete,
    resetItemValue,
} from "./RangeSetQuestion.ts";
import Tooltip from "$lib/common/Tooltip/Tooltip.svelte";

let {
    question = $bindable<RangeSetQuestion>(),
    save,
    sync,
}: {
    question: RangeSetQuestion;
    save?: (question: RangeSetQuestion) => void;
    sync?: (question: RangeSetQuestion) => void;
} = $props();

const items = $derived([
    ...question.canonicalItems,
    ...(question.userItems ?? []),
]);

function handleResetItem(itemId: string) {
    resetItemValue(question, itemId);
    save?.(question);
    sync?.(question);
}

function tryAddUserItem(userItemInput: string) {
    const sanitized = clientsideSanitize(userItemInput);
    if (sanitized.length === 0) return;
    if (items.some((item) => item.itemText === sanitized)) return;
    addUserItem(question, sanitized);
    save?.(question);
    sync?.(question);
}
</script>

<fieldset class="range-set">
    <legend class="legend-text">
        {#if typeof question.questionText === "string"}
            {@html clientsideSanitize(question.questionText)}
        {:else}
            {@render question.questionText()}
        {/if}
    </legend>
    {#if question.rangeLabels && question.rangeLabels.length > 0}
        <div class="range-input-labels">
            {#each question.rangeLabels as label, i (i)}
                <span class="range-input-label">{@html clientsideSanitize(label)}</span>
            {/each}
        </div>
    {/if}

    {#each items as item (item.itemId)}
        {@render rangeItem(item)}
    {/each}

    {#if question.allowUserItems}
        {let userItemInput: string = $state("")}
        {let addingUserItem: boolean = $state(false)}
        <div class="new-user-item-form">
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
                            tryAddUserItem(userItemInput);
                            userItemInput = "";
                            addingUserItem = false;
                        }
                    }}
                />
                {#if userItemInput.length > 0}
                    {#if !items.some((item) => item.itemText === userItemInput)}
                        <button
                            type="button"
                            class="new-user-item-confirm-button exp-default-button"
                            aria-label="Submit a new item"
                            onclick={() => {
                                tryAddUserItem(userItemInput);
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
    {#if question.tickInterval}
        <datalist id={`${question.qid}-datalist`}>
            {#each getTicks([question.min, question.max], question.tickInterval) as tick (tick)}
                <option value={tick}>{tick}</option>
            {/each}
        </datalist>
    {/if}
</fieldset>

{#snippet rangeItem(item: RangeSetItem)}
    {const inputId = `${question.qid}-${item.itemId}`}
    <div class="range-item">
    <label
        for={inputId}
        class="range-name-label"
        aria-describedby={item.tooltipText ? `${inputId}-tooltip` : undefined}
    >
            {#if item.tooltipText}
                <Tooltip text={item.tooltipText}>
                    {#if typeof item.itemText === "string"}
                        {@html clientsideSanitize(item.itemText)}
                    {:else}
                        {@render item.itemText()}
                    {/if}
                </Tooltip>
            {:else if typeof item.itemText === "string"}
                {@html clientsideSanitize(item.itemText)}
            {:else}
                {@render item.itemText()}
            {/if}
        </label>
    <input
        class="range-input"
        class:is-unset={item.value === undefined}
        type="range"
        name={inputId}
        id={inputId}
        min={question.min}
        max={question.max}
        step={question.step}
        value={item.value ?? question.initialValue ?? question.min}
        oninput={(e) => {
                item.value = Number(e.currentTarget.value);
            }}
        onchange={(e) => {
                item.value = Number(e.currentTarget.value);
                save?.(question);
                if (isQuestionComplete(question)) sync?.(question);
            }}
        list={question.tickInterval ? `${question.qid}-datalist` : undefined}
    />

    <button
        type="button"
        class="range-reset-button"
        class:disabled={item.value === undefined}
        data-value={item.value?.toFixed(1) ?? ""}
        aria-label="Reset value"
        onclick={() => {
                handleResetItem(item.itemId);
            }}
    >
        </button>
</div>
{/snippet}

<style>
.range-set {
    display: grid;
    grid-template-columns: fit-content(10em) 1fr 3em;
    column-gap: 1em;
    row-gap: 1em;
    width: 100%;
}

.legend-text {
    font-size: 1.2em;
    padding-left: 0.25em;
    padding-right: 0.25em;
    margin-bottom: 0.5em;
}

.range-input-labels {
    grid-column: 2;
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 0.25em;
    margin-bottom: -0.5em;
}

.range-input-label {
    text-align: center;
    max-width: 5em;
}

.range-item {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: center;
}

.range-name-label {
    text-align: center;
}

.range-input {
    &.is-unset {
        opacity: 0.3;
        filter: grayscale(100%);
    }
}

.new-user-item-form {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    align-items: center;
}

.new-user-item-button,
.new-user-item-cancel-button {
    grid-column: 1;
    justify-self: center;
    width: 1.5em;
    height: 1.5em;
    padding: 0;
    font-size: 1.25em;
    font-weight: bold;
    cursor: pointer;
}

.new-user-item-confirm-button {
    grid-column: 3;
    justify-self: center;
    width: 1.5em;
    height: 1.5em;
    padding: 0;
    font-size: 1.25em;
    font-weight: bold;
    cursor: pointer;
}

.new-user-item-input {
    grid-column: 2;
}

.new-user-item-cancel-button {
    padding: 0;
    color: inherit;
    font-size: inherit;
    width: 3.5em;
    text-align: center;
    background: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
    &:hover:not(.disabled) {
        background: none;
        background-color: transparent;
        border: none;
        box-shadow: none;
        &::before {
            content: "❌";
        }
    }
    &::before {
        content: "✕";
    }
}

.new-user-item-error-message {
    grid-column: 3;
    color: red;
    font-size: 0.8em;
}

.range-reset-button {
    padding: 0;
    color: inherit;
    font-size: inherit;
    width: 3.5em;
    text-align: center;
    justify-self: center;
    background: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
    &:hover:not(.disabled) {
        background: none;
        background-color: transparent;
        border: none;
        box-shadow: none;
        &::before {
            content: "❌";
        }
    }
    &::before {
        content: attr(data-value);
    }
    &.disabled::before {
        content: "-";
        opacity: 0.5;
    }
}
</style>
