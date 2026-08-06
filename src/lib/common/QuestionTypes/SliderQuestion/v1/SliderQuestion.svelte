<script lang="ts">
import { getTicks, type SliderQuestionProps } from "./SliderQuestion.ts";
import { onMount } from "svelte";
let { props, inputValue = $bindable(null) }: {
    props: SliderQuestionProps;
    inputValue: number | null;
} = $props();
import debugLib from "debug";
const debug = $derived(debugLib(`ccg-01:SliderQuestion:${props.qid}`));

onMount(() => {
    inputValue = props.initialValue ?? null;
});
</script>

<div class="slider-question">
    <span class="question-label">
        {@html props.questionText}
    </span>

    <div class="slider-container">
        <input
            type="range"
            name={props.qid}
            min={props.range[0]}
            max={props.range[1]}
            step={props.step ?? 1}
            bind:value={inputValue}
            class:is-null={inputValue === null}
            list={`${props.qid}-datalist`}
        />
        <datalist id={`${props.qid}-datalist`}>
            {#each getTicks(props.range, props.tickInterval ?? 1) as tick (tick)}
                <option value={tick}>{tick}</option>
            {/each}
        </datalist>

        <button
            class="reset-button"
            class:disabled={inputValue === null}
            data-value={inputValue?.toFixed(1) ?? ""}
            aria-label="Reset value"
            onclick={() => {
                inputValue = props.initialValue ?? null;
            }}
        >
        </button>
    </div>
</div>

<div class="slider-question">
    <fieldset>
        <legend class="question-label">{@html props.questionText}</legend>
        <span class="question-label"> </span>

        <div class="slider-container">
            <input
                type="range"
                name={props.qid}
                min={props.range[0]}
                max={props.range[1]}
                step={props.step ?? 1}
                bind:value={inputValue}
                class:is-null={inputValue === null}
                list={`${props.qid}-datalist`}
            />
            <datalist id={`${props.qid}-datalist`}>
                {#each getTicks(props.range, props.tickInterval ?? 1) as tick (tick)}
                    <option value={tick}>{tick}</option>
                {/each}
            </datalist>
            <button
                class="reset-button"
                class:disabled={inputValue === null}
                data-value={inputValue?.toFixed(1) ?? ""}
                aria-label="Reset value"
                onclick={() => {
                    inputValue = props.initialValue ?? null;
                }}
            >
            </button>
        </div>
    </fieldset>
</div>

<style>
.slider-question {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.question-label {
    font-size: 1.2rem;
}

.slider-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    align-self: center;
    gap: 1rem;
    width: 90%;
    min-height: 1.5lh;
}

.reset-button {
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
}

input[type="range"] {
    width: 100%;
    &.is-null {
        opacity: 0.3;
        filter: grayscale(100%);
    }
}
</style>
