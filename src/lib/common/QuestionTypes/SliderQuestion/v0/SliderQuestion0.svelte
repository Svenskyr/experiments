<script lang="ts">
type SliderQuestionProps = {
    qid: string;
    questionText: string;
    range: [number, number];
    step?: number;
    initialValue?: number;
    tickInterval?: number;
    rangeLabels?: string[];
    showValueLabel?: boolean;
    required: boolean;

    onComplete?: () => void;
    exportValue?: (qid: string, value: number | null) => void;
};

import { onMount } from "svelte";

let { props, bindableValue = $bindable(null) }: {
    props: SliderQuestionProps;
    bindableValue: number | null;
} = $props();
let inputValue: number | null = $state(null);

interface tick {
    value: number;
    label: string;
}

let ticks: tick[] = $derived.by(() => {
    const arr: tick[] = [];
    const interval = props.tickInterval ?? 1;
    for (let i = props.range[0]; i <= props.range[1]; i += interval) {
        arr.push({ value: i, label: i.toString() });
    }
    return arr;
});

function handleInput(target: EventTarget & HTMLInputElement) {
    inputValue = Number(target.value);
    bindableValue = inputValue;
}

function enforceBounds(value: number | null): number | null {
    if (value === null) return null;
    if (value < props.range[0]) return props.range[0];
    if (value > props.range[1]) return props.range[1];
    return round(value, 2);
}

function clamp(value: number | null): number | null {
    return value ? round(Math.min(Math.max(value, props.range[0]), props.range[1]), 2) : null;
}

function round(x: number, places: number) {
    const factor = Math.pow(10, places);
    return Math.round(x * factor) / factor;
}
</script>

<div class="exp-question slider-question">
    <label for={props.qid} class="question-label"><span class="qid">{props.qid}</span>
        {@html props.questionText}</label>

    <div class="input-container">
        <div class="number-input-container">
            <button
                class="reset-button"
                onclick={() => {
                    inputValue = null;
                    bindableValue = inputValue;
                }}
            >
                Reset
            </button>
            <input
                type="number"
                name={props.qid}
                min={props.range[0]}
                max={props.range[1]}
                step={props.step ?? 1}
                bind:value={inputValue}
                oninput={(e) =>
                    handleInput(e.currentTarget as EventTarget & HTMLInputElement)}
                onblur={() => {
                    {
                        inputValue = clamp(inputValue);
                        bindableValue = inputValue;
                    }
                }}
            />
        </div>

        <div class="slider-input-container">
            {#if props.rangeLabels}
                <div class="range-end-labels">
                    {#each props.rangeLabels as label, i}
                        <span>{label}</span>
                    {/each}
                </div>
            {/if}

            <!-- // bind:value={inputValue} -->
            <input
                type="range"
                name={props.qid}
                min={props.range[0]}
                max={props.range[1]}
                step={props.step ?? 1}
                list="{props.qid}-datalist"
                value={inputValue ?? 0}
                class:is-null={inputValue === null}
                oninput={(e) =>
                    handleInput(e.currentTarget as EventTarget & HTMLInputElement)}
                onpointerdown={(e) =>
                    handleInput(e.currentTarget as EventTarget & HTMLInputElement)}
                onblur={() => {
                    if (inputValue !== null) {
                        inputValue = clamp(inputValue);
                        bindableValue = inputValue;
                    }
                }}
            />

            <div class="range-tick-labels">
                {#each ticks as tick}
                    <span class:active={inputValue === tick.value}>{tick.label}</span>
                {/each}
            </div>

            <datalist id="{props.qid}-datalist">
                {#each ticks as tick}
                    <option value={tick.value}></option>
                {/each}
            </datalist>
        </div>
    </div>
</div>

<style>
:global(:root) {
    --slider-track-thickness: 6px;
    --slider-track-radius: 4px;
    --slider-track-color: lightgrey;
    --slider-thumb-diameter: 15px;
    --slider-thumb-color: rgb(0, 134, 179);
    /* --slider-thumb-color: darkviolet; */
    --slider-thumb-roundedness: 100%;
    --number-input-width: 3.5em;
    --slider-input-width: calc(100% - var(--number-input-width) - 1em);
}

.slider-question {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 3em 0;
    /* TODO: Move this margin to wrapper div in parent */
}

.question-label {
    font-size: 1.2em;
    /* font-weight: bold; */
}

.input-container {
    display: flex;
    flex-direction: row;
    gap: 1em;
    margin: 1em 0;
}

.number-input-container {
    display: flex;
    flex-direction: column;
    width: var(--number-input-width);
    /* justify-content: space-evenly; */
    justify-content: space-between;
    padding: 1px 0;
}

.slider-input-container {
    display: flex;
    flex-direction: column;
    width: var(--slider-input-width);
}

input[type="range"] {
    appearance: none;
    margin: 0;
    cursor: pointer;
    background: transparent;

    /* Chromium shits itself if it sees a firefox specifier */
    &::-webkit-slider-runnable-track {
        height: var(--slider-track-thickness);
        background: var(--slider-track-color);
        border-radius: var(--slider-track-radius);
    }

    /* Chromium shits itself if it sees a firefox specifier */
    &::-webkit-slider-thumb {
        appearance: none;
        width: var(--slider-thumb-diameter);
        height: var(--slider-thumb-diameter);
        background: var(--slider-thumb-color);
        border-radius: var(--slider-thumb-roundedness);
        margin-top: calc((var(--slider-track-thickness) - var(--slider-thumb-diameter)) / 2);
        cursor: pointer;
    }

    /* Firefox */
    &::-moz-range-track {
        height: var(--slider-track-thickness);
        background: var(--slider-track-color);
        border-radius: var(--slider-track-radius);
    }

    /* Firefox */
    &::-moz-range-thumb {
        appearance: none;
        width: var(--slider-thumb-diameter);
        height: var(--slider-thumb-diameter);
        background: var(--slider-thumb-color);
        border-radius: var(--slider-thumb-roundedness);
        margin-top: calc((var(--slider-track-thickness) - var(--slider-thumb-diameter)) / 2);
        cursor: pointer;
    }

    &.is-null::-webkit-slider-thumb {
        opacity: 0;
    }

    &.is-null::-moz-range-thumb {
        opacity: 0;
    }
}

.range-end-labels {
    display: flex;
    justify-content: space-between;
    padding: 0 calc(var(--slider-thumb-diameter) / 2);
    margin-bottom: 0.5em;
    user-select: none;
}

.range-end-labels span {
    display: flex;
    justify-content: center;
    width: 0;
    overflow: visible;
    white-space: nowrap;
}

.range-end-labels span {
    flex: 1;
    display: flex;
    white-space: nowrap;
}

.range-end-labels span:first-child {
    justify-content: flex-start;
    margin-right: calc(var(--slider-thumb-diameter) / -2);
}

.range-end-labels span:last-child {
    justify-content: flex-end;
    margin-right: calc(var(--slider-thumb-diameter) / -2);
}

.range-tick-labels {
    display: flex;
    justify-content: space-between;
    padding-left: 7px;
    padding-right: 10px;
    user-select: none;
}

.range-tick-labels span {
    display: flex;
    justify-content: center;
    width: 1px;
    overflow: visible;
    white-space: nowrap;
    /* font-size: 0.9em; */
}

.range-tick-labels span.active {
    font-weight: bold;
}

.qid {
    font-weight: bold;
    margin-right: 0.5em;
    background-color: var(--color-default);
    padding: 2px 6px;
    border-radius: 4px;
}
</style>
