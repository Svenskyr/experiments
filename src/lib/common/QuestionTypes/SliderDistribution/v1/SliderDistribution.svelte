<script lang="ts">
import type {
    DistributionBar,
    DistributionBarProps,
    DistributionSubcomponent,
    DistributionSubcomponentProp,
} from "./DistributionBar/distBar.svelte.ts";
import { AllocationQuestion } from "allocationQuestionBase.svelte.ts";
let { props, bindableValues = $bindable([]), onInput }: {
    props: DistributionBarProps;
    bindableValues?: { name: string; value: number }[];
    onInput?: (values: { name: string; value: number }[]) => void;
} = $props();

// svelte-ignore state_referenced_locally
const AQ: AllocationQuestion = new AllocationQuestion(props);

$effect(() => {
    const values = AQ.subcomponents.map((sc) => ({ name: sc.name, value: sc.value }));
    values.push({ name: AQ.remainderLabel ?? "Remainder", value: 100 - AQ.sum });
    bindableValues = values;
    if (onInput) {
        onInput(bindableValues);
    }
});

const descriptions: boolean = AQ.subcomponents.some((sc) => sc.description !== undefined);

function clamp(value: number | null, min: number, max: number): number | null {
    if (value === null) return null;
    return round(Math.min(Math.max(value, min), max), 2);
}

function round(x: number, places: number) {
    const factor = Math.pow(10, places);
    return Math.round(x * factor) / factor;
}

function onNumberInputScroll(e: WheelEvent, sc: DistributionSubcomponent) {
    e.preventDefault();
    const currentTarget = e.currentTarget as HTMLInputElement;
    const delta = e.deltaY < 0 ? 1 : -1;
    currentTarget.value = clamp(sc.value + delta, 0, sc.max)?.toString()
        ?? currentTarget.value;
    sc.value = parseFloat(currentTarget.value);
}

function adjustHslLightness_1(hslString: string, adjustment: number): string {
    console.log(
        `adjustHslLightness called with hslString=${hslString} and adjustment=${adjustment}`,
    );
    const match = hslString.match(/(\d*\.?\d+),\s*(\d+)%,\s*(\d+)%/);
    if (!match) return hslString;
    let h = parseFloat(match[1]) % 360; // Normalize hue to 0-360
    let s = match[2];
    let l = Math.min(100, Math.max(0, parseInt(match[3]) + adjustment));

    return `hsl(${h}, ${s}%, ${l}%)`;
}

const adjustHslLightness_2 = (hslStr: string, delta: number) => {
    const [hue, saturation, lightness] = hslStr.match(/\d+/g)!.map(Number);
    if (isNaN(hue) || isNaN(saturation) || isNaN(lightness)) {
        console.error(`Invalid HSL string: ${hslStr}`);
        return hslStr;
    }
    const newLightness = Math.max(0, Math.min(100, lightness + delta));
    return `hsl(${hue}, ${saturation}%, ${newLightness}%)`;
};
</script>

<div class="exp-question distribution-bar-builder">
    <div class="question-label">
        <span class="qid">{AQ.qid}</span> {@html AQ.questionText}
    </div>

    <div class="input-container">
        <div class="cumulative-display-bar" style="grid-column: 3">
            {#each AQ.subcomponents as sc, i (sc.displayIndex)}
                <span
                    class="cumulative-display-segment"
                    style={`width: ${sc.value}%; background-color: ${sc.color};`}
                >
                    {#if sc.value >= 5}
                        {#if sc.value > 50}{sc.name}:{/if}
                        {sc.value}%
                    {/if}
                </span>
            {/each}
            {#if AQ.remainderLabel}
                <span
                    class="cumulative-display-segment"
                    style={`width: ${(100 -
                        AQ.sum)}%; background-color: var(--slider-track-color);`}
                >
                    {#if 100 - AQ.sum >= 5}
                        {#if 100 - AQ.sum > 10}{AQ.remainderLabel}:{/if}
                        {100 - AQ.sum}%
                    {/if}
                </span>
            {/if}
        </div>

        {#each AQ.subcomponents as sc, i (sc.displayIndex)}
            <span class="sc-name" style={`background-color: ${sc.color};`}>{sc.name}</span>

            <input
                type="number"
                min="0"
                max={sc.max}
                step="1"
                bind:value={sc.value}
                onwheel={(e) => {
                    onNumberInputScroll(e, sc);
                }}
            />

            <input
                type="range"
                min="0"
                max={sc.max}
                step="1"
                bind:value={sc.value}
                style={`
                        width: calc(${sc.max}% + var(--slider-thumb-diameter));
                        margin-left: calc(${sc.sumBehind}% - var(--slider-thumb-diameter) / 2);
                        // margin-left: ${sc.sumBehind}%;
                        // transform: translateX(calc(var(--slider-thumb-diameter) / -2));
                        --progress: ${(sc.value / sc.max) * 100}%;
                        --slider-thumb-color: ${sc.color};`}
            />
        {/each}

        <span class="sc-name" style="background-color: lightgrey">{AQ.remainderLabel}</span>
        <span class="sc-number-input" style="margin: 0.2em 0.2em; font-size: 0.9em">{
            100 - AQ.sum
        }</span>
    </div>

    {#if descriptions}
        <div class="sc-descriptions-grid">
            {#each AQ.subcomponents as sc}
                {#if sc.description}
                    <span class="sc-name" style={`background-color: ${sc.color};`}>{sc.name}</span>
                    <span
                        class="sc-description-text"
                        style={`background-color: ${adjustHslLightness_2(sc.color, 30)};`}
                    >{@html sc.description}</span>
                {/if}
            {/each}
        </div>
    {/if}
</div>

<style>
:global(:root) {
    --slider-track-thickness: 6px;
    --slider-track-radius: 4px;
    --slider-thumb-diameter: 15px;
    --slider-thumb-roundedness: 100%;
    --number-input-width: 3.5em;
    --slider-input-width: calc(100% - var(--number-input-width) - 1em);
    --slider-track-color: oklch(0.8 0 0);
    --slider-thumb-color: rgb(0, 134, 179);
}

.distribution-bar-builder {
    display: flex;
    flex-direction: column;
    gap: 2em;
}

.question-label {
    /* font-weight: bold; */
    font-size: 1.2em;
}

.input-container {
    display: grid;
    /* sc.name, numInput, sliderInput */
    grid-template-columns: 10em 3.5em auto;
    /* grid-template-columns: 10rem 3.5rem 1fr; */
    /* grid-template-columns: 10rem 3.5rem minmax(0, 1fr); */
    column-gap: 1rem;
    row-gap: 0.5rem;
}

.cumulative-display-bar {
    display: flex;
    flex-direction: row;
    height: 3em;
    border-radius: 10px;
    overflow: clip;
}

.cumulative-display-segment {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1em;
    font-weight: bold;
    user-select: none;
}

input[type="range"] {
    appearance: none;
    margin: 0;
    cursor: pointer;
    background: transparent;
    box-sizing: border-box;

    /* Chromium shits itself if it sees a firefox specifier */
    &::-webkit-slider-runnable-track {
        height: var(--slider-track-thickness);
        background: linear-gradient(
            to right,
            var(--slider-thumb-color) 0%,
            var(--slider-thumb-color) var(--progress),
            var(--slider-track-color) var(--progress),
            var(--slider-track-color) 100%
        );
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
        background: linear-gradient(
            to right,
            var(--slider-thumb-color) 0%,
            var(--slider-thumb-color) var(--progress),
            var(--slider-track-color) var(--progress),
            var(--slider-track-color) 100%
        );
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
}

.sc-descriptions-grid {
    display: grid;
    grid-template-columns: auto auto;
    gap: 1em;
    justify-content: center;
}

.sc-descriptions-flex {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}

.sc-name {
    width: fit-content;
    justify-self: end;
    padding: 0.2em 0.5em;
    border-radius: 5px;
}

.sc-description-text {
    width: fit-content;
    justify-self: start;
    padding: 0.2em 0.5em;
    border-radius: 5px;
}

.qid {
    font-weight: bold;
    margin-right: 0.5em;
    background-color: var(--color-default);
    padding: 2px 6px;
    border-radius: 4px;
}
</style>
