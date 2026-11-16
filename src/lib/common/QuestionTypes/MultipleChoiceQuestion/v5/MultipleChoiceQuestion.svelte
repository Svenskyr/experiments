<script lang="ts">
import { browser } from "$app/env";
import DOMPurify from "dompurify";
import type { McqGrade, McqKey, McqPublic, McqResponse } from "./MultipleChoiceQuestion.ts";
import {
    addUserItem,
    allItems,
    canAddUserItem,
    deleteUserItem,
    grade as gradeResponse,
    isUserItem,
    MAX_USER_ITEM_LENGTH,
    resetResponse,
    selectItem,
    status,
} from "./MultipleChoiceQuestion.ts";

let {
    id,
    config,
    key,
    required = false,
    response = $bindable<McqResponse>(),
    grade,
    oncommit,
}: {
    id: string; // Prefix for input IDs and the input group name
    config: McqPublic;
    key?: McqKey | undefined; // Present: grade in the browser. Absent: use `grade`.
    required?: boolean | undefined; // True: a complete response cannot be made incomplete
    response: McqResponse;
    grade?: McqGrade | undefined; // From the server, when `key` is absent
    oncommit?: (() => void) | undefined;
} = $props();

const items = $derived(allItems(config, response));
const shownGrade = $derived(key ? gradeResponse(config, key, response) : grade);
const context = $derived({ required, grade: shownGrade });
const complete = $derived(status(config, response, shownGrade) === "complete");
// Under "correct", any change to a required, complete response needs a new grade, so lock it.
const locked = $derived(required && complete && config.completion === "correct");

function sanitize(html: string): string {
    return browser ? DOMPurify.sanitize(html) : html;
}

/** Run a command; commit only if it changed the response. */
function commit(command: () => void) {
    const before = JSON.stringify(response);
    command();
    if (JSON.stringify(response) !== before) oncommit?.();
}

function handleSelectItem(input: HTMLInputElement, itemId: string) {
    commit(() => selectItem(config, response, itemId, input.checked, context));
    // The command may have been a no-op; make the input show the response.
    input.checked = response.selectedItemIds.includes(itemId);
}

function handleAddUserItem(itemText: string) {
    commit(() => addUserItem(config, response, itemText, context));
}
</script>

<fieldset class="response-items-fieldset">
        <legend class="legend-text">{@html sanitize(config.questionText)}</legend>
        {#if config.allowReset}
            <button
                type="button"
                class="reset-button"
                disabled={required && complete}
                onclick={() => commit(() => resetResponse(config, response, context))}
            >Reset</button>
        {/if}
        <div class="response-items-container">
        {#each items as item (item.itemId)}
            {const inputId = `${id}-${item.itemId}`}
            {const selected = $derived(response.selectedItemIds.includes(item.itemId))}
            {const attempted = $derived(response.attemptedItemIds.includes(item.itemId))}
            {const truth = $derived(config.showFeedback
                ? shownGrade?.itemTruth[item.itemId]
                : undefined)}
            {const correct = $derived(truth === true && selected)}
            {const uncorrected = $derived(truth === false && selected)}
            {const corrected = $derived(truth === false && attempted && !selected)}
            {const disabled = $derived(config.showFeedback === true &&
                (correct || corrected || (shownGrade?.allTrueSelected === true && !uncorrected)))}
            <div class="mcq-response-item">
                <label
                    for={inputId}
                    class="mcq-response-item-label"
                    class:correct
                    class:uncorrected
                    class:corrected
                    class:disabled
                >
                    <input
                        id={inputId}
                        name={id}
                        type={config.inputType}
                        value={item.itemId}
                        checked={selected}
                        disabled={locked}
                        onchange={(e) => handleSelectItem(e.currentTarget, item.itemId)}
                    />
                    <span class="mcq-response-item-text">
                        {#if isUserItem(response, item.itemId)}
                            {item.itemText}
                        {:else}
                            {@html sanitize(item.itemText)}
                        {/if}
                    </span>
                </label>
                {#if isUserItem(response, item.itemId)}
                    <button
                        type="button"
                        class="delete-user-item-button"
                        aria-label="Delete this user-provided item"
                        onclick={() =>
                            commit(() => deleteUserItem(config, response, item.itemId, context))}
                    >
                    </button>
                {/if}
            </div>
        {/each}
        {#if config.allowUserItems}
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
                        id={`${id}-new-user-item-input`}
                        placeholder="Add a new item..."
                        class="new-user-item-input"
                        maxlength={MAX_USER_ITEM_LENGTH}
                        size={Math.max(Math.min(userItemInput.length, 40), 10)}
                        bind:value={userItemInput}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                handleAddUserItem(userItemInput);
                                userItemInput = "";
                                addingUserItem = false;
                            }
                        }}
                    />
                    {#if userItemInput.length > 0}
                        {#if canAddUserItem(config, response, userItemInput)}
                            <button
                                type="button"
                                class="new-user-item-confirm-button exp-default-button"
                                aria-label="Submit a new item"
                                onclick={() => {
                                    handleAddUserItem(userItemInput);
                                    userItemInput = "";
                                    addingUserItem = false;
                                }}
                            >
                                ✓
                            </button>
                        {:else if items.some((item) => item.itemText === userItemInput.trim())}
                            <span class="new-user-item-error-message">Item already exists</span>
                        {/if}
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
</fieldset>

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
    &.uncorrected {
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
