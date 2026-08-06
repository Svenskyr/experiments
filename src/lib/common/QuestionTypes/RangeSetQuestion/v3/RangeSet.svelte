<script lang="ts">
import {
    createUserItem,
    getTicks,
    getUserItems,
    type RangeSetItemProps,
    type RangeSetProps,
} from "./RangeSet.ts";
import { onMount } from "svelte";
import Tooltip from "$lib/components/Tooltip/Tooltip.svelte";
import DOMPurify from "dompurify";
let {
    rangeSetProps,
    boundValues = $bindable({}),
    persistToLocalStorage = true,
    onCommit,
}: {
    rangeSetProps: RangeSetProps;
    boundValues: Record<string, number | null>;
    persistToLocalStorage?: boolean;
    onCommit?: (qid: string, values: Record<string, number | null>) => void;
} = $props();

let userItems: RangeSetItemProps[] = $state([]);
onMount(() => {
    if (!persistToLocalStorage) {
        return;
    }

    userItems = JSON.parse(
        localStorage.getItem(`${rangeSetProps.qid}-user-items`) || "[]",
    ) as RangeSetItemProps[];
    const storedValues: Record<string, number | null> | null = JSON.parse(
        localStorage.getItem(rangeSetProps.qid) || "{}",
    );
    for (const item of [...rangeSetProps.items, ...userItems]) {
        boundValues[item.itemId] = storedValues?.[item.itemId] ?? null;
    }
});

const rangeItems: RangeSetItemProps[] = $derived([
    ...rangeSetProps.items,
    ...userItems,
]);

let addingUserItem: boolean = $state(false);
let newUserItemInput: string = $state("");
</script>

<fieldset class="range-set">
    <legend class="legend-text">{rangeSetProps.legendText}</legend>
    {#if rangeSetProps.rangeLabels && rangeSetProps.rangeLabels.length > 0}
        <div class="range-input-labels">
            {#each rangeSetProps.rangeLabels as label}
                <span class="range-input-label">{label}</span>
            {/each}
        </div>
    {/if}
    {#each rangeItems as item (item.itemId)}
        {@render rangeItem(item)}
    {/each}
    {#if rangeSetProps.allowUserItems}
        <form
            class="new-user-item-form"
            onsubmit={(e) => {
                e.preventDefault();
                const userInput = DOMPurify.sanitize(newUserItemInput).trim();
                if (userInput.length === 0) {
                    addingUserItem = false;
                    return;
                }
                const userItem = createUserItem(userInput);
                if (userItem.itemId.length === 0) {
                    alert("Invalid item name!");
                    return;
                }
                if (rangeItems.some((item) => item.itemId === userItem.itemId)) {
                    alert("Item name already exists!");
                    return;
                }

                userItems.push(userItem);
                if (persistToLocalStorage) {
                    localStorage.setItem(
                        `${rangeSetProps.qid}-user-items`,
                        JSON.stringify(userItems),
                    );
                }
                boundValues[userItem.itemId] = rangeSetProps.initialValue ?? null;
                if (persistToLocalStorage) {
                    localStorage.setItem(rangeSetProps.qid, JSON.stringify(boundValues));
                }
                onCommit?.(rangeSetProps.qid, boundValues);
                newUserItemInput = "";
                addingUserItem = false;
            }}
        >
            {#if !addingUserItem}
                <button
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
                    class="new-user-item-cancel-button"
                    type="button"
                    aria-label="Cancel adding a new item"
                    onclick={() => {
                        addingUserItem = false;
                    }}
                >
                </button>

                <input
                    class="new-user-item-input"
                    type="text"
                    placeholder="Add a new item..."
                    bind:value={newUserItemInput}
                />

                <button
                    class="new-user-item-confirm-button exp-default-button"
                    type="submit"
                >
                    ✓
                </button>
            {/if}
        </form>
    {/if}
    {#if rangeSetProps.tickInterval}
        <datalist id={`${rangeSetProps.qid}-datalist`}>
            {#each             getTicks([rangeSetProps.min, rangeSetProps.max], rangeSetProps.tickInterval) as
                tick
            }
                <option value={tick}>{tick}</option>
            {/each}
        </datalist>
    {/if}
</fieldset>

{#snippet rangeItem(item: RangeSetItemProps)}
    <div class="range-item">
    <label
        for={item.itemId}
        class="range-name-label"
        aria-describedby={item.tooltipText ? `${item.itemId}-tooltip` : undefined}
    >
            {#if item.tooltipText}
                <Tooltip text={item.tooltipText}>
                    {@html item.nameLabel}
                </Tooltip>
            {:else}
                {@html item.nameLabel}
            {/if}
        </label>
    <input
        class="range-input"
        type="range"
        name={item.itemId}
        id={item.itemId}
        min={rangeSetProps.min}
        max={rangeSetProps.max}
        step={rangeSetProps.step}
        value={boundValues[item.itemId] ?? rangeSetProps.initialValue}
        oninput={(e) => {
                boundValues[item.itemId] = Number(e.currentTarget.value);
            }}
        onchange={(e) => {
                boundValues[item.itemId] = Number(e.currentTarget.value);
                if (persistToLocalStorage) {
                    localStorage.setItem(rangeSetProps.qid, JSON.stringify(boundValues));
                }
                onCommit?.(rangeSetProps.qid, boundValues);
            }}
        class:is-null={boundValues[item.itemId] === null}
        list={`${rangeSetProps.qid}-datalist`}
    />

    <button
        class="range-reset-button"
        class:disabled={boundValues[item.itemId] === null}
        data-value={boundValues[item.itemId]?.toFixed(1) ?? ""}
        aria-label="Reset value"
        onclick={() => {
                boundValues[item.itemId] = null;
                if (userItems.some((userItem) => userItem.itemId === item.itemId)) {
                    delete boundValues[item.itemId];
                    userItems = userItems.filter((userItem) => userItem.itemId !== item.itemId);
                    if (persistToLocalStorage) {
                        localStorage.setItem(
                            `${rangeSetProps.qid}-user-items`,
                            JSON.stringify(userItems),
                        );
                    }
                }

                if (persistToLocalStorage) {
                    localStorage.setItem(rangeSetProps.qid, JSON.stringify(boundValues));
                }
                onCommit?.(rangeSetProps.qid, boundValues);
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
    &.is-null {
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
