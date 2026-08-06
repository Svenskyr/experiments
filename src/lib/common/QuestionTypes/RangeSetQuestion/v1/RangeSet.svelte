<script lang="ts">
import debugLib from "debug";
const debug = debugLib("RangeSet.svelte");
import {
    constructRangeSetObject,
    getTicks,
    type RangeSet,
    type RangeSetProps,
    restoreClientResponses,
    storeClientResponses,
} from "./RangeSet.ts";
import { onMount } from "svelte";
let { props, values = $bindable({}) }: {
    props: RangeSetProps;
    values: Record<string, number | null>;
} = $props();
import { browser } from "$app/environment";

let rangeSetObject: RangeSet = $state(constructRangeSetObject(props));

onMount(() => {
    rangeSetObject = restoreClientResponses(rangeSetObject);
    for (const item of rangeSetObject.items) {
        values[item.itemId] = item.inputValue ?? null;
    }
});
</script>

<fieldset class="range-set">
    <legend class="legend-text">{@html rangeSetObject?.legendText}</legend>
    {#if rangeSetObject?.rangeLabels && rangeSetObject?.rangeLabels.length > 0}
        <div class="range-input-labels">
            {#each rangeSetObject?.rangeLabels as label}
                <span class="range-input-label">{label}</span>
            {/each}
        </div>
    {/if}
    {#each rangeSetObject.items as item (item.itemId)}
        <div class="range-item">
            <label for={item.itemId} class="range-name-label">{@html item.nameLabel}</label>
            <input
                class="range-input"
                type="range"
                name={item.itemId}
                id={item.itemId}
                min={rangeSetObject?.min}
                max={rangeSetObject?.max}
                step={rangeSetObject?.step}
                bind:value={() => values[item.itemId] ?? rangeSetObject.initialValue, (v) => {
                    values[item.itemId] = Number(v);
                }}
                onchange={(e) => {
                    item.inputValue = Number(e.currentTarget.value);
                    storeClientResponses(rangeSetObject.qid, values);
                }}
                class:is-null={values[item.itemId] === null}
                list={`${rangeSetObject?.qid}-datalist`}
            />
            {#if rangeSetObject?.tickInterval}
                <datalist id={`${rangeSetObject.qid}-datalist`}>
                    {#each                 getTicks(
                    [rangeSetObject.min, rangeSetObject.max],
                    rangeSetObject?.tickInterval,
                ) as
                        tick
                        (tick)
                    }
                        <option value={tick}>{tick}</option>
                    {/each}
                </datalist>
            {/if}
            <button
                class="range-reset-button"
                class:disabled={values[item.itemId] === null}
                data-value={values[item.itemId]?.toFixed(1) ?? ""}
                aria-label="Reset value"
                onclick={() => {
                    values[item.itemId] = null;
                    storeClientResponses(rangeSetObject.qid, values);
                }}
            >
            </button>
        </div>
    {/each}
</fieldset>

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

.range-reset-button {
    padding: 0;
    color: inherit;
    font-size: inherit;
    width: 3.5em;
    text-align: center;
    background: none;
    background-color: transparent;
    border: none;
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
    }
}
</style>
