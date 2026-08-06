<script lang="ts">
import { getTicks, type RangeSetProps } from "./RangeSet.ts";
import { onMount } from "svelte";
let { rangeSetProps, boundValues = $bindable({}), onCommit }: {
    rangeSetProps: RangeSetProps;
    boundValues: Record<string, number | null>;
    onCommit?: (qid: string, values: Record<string, number | null>) => void;
} = $props();

onMount(() => {
    const storedValues: Record<string, number | null> | null = JSON.parse(
        localStorage.getItem(rangeSetProps.qid) || "{}",
    );
    for (const item of rangeSetProps.items) {
        boundValues[item.itemId] = storedValues?.[item.itemId] ?? null;
    }
});
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
    {#each rangeSetProps.items as item (item.itemId)}
        <div class="range-item">
            <label for={item.itemId} class="range-name-label">{@html item.nameLabel}</label>
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
                    localStorage.setItem(rangeSetProps.qid, JSON.stringify(boundValues));
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
                    localStorage.setItem(rangeSetProps.qid, JSON.stringify(boundValues));
                    onCommit?.(rangeSetProps.qid, boundValues);
                }}
            >
            </button>
        </div>
    {/each}
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
