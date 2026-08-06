<script lang="ts">
import debugLib from "debug";
const debug = debugLib("ccg-01:Feedback");
import { onMount } from "svelte";
import {
    defaultFeedbackForm,
    type FeedbackForm,
    getLocalFeedback,
    setLocalFeedback,
} from "./Feedback.ts";
let { parentName, targetName } = $props();
import RangeSet from "../Q-RangeSet/v3/RangeSet.svelte";

let feedback: FeedbackForm | null = $state(null);

onMount(() => {
    feedback = getLocalFeedback(parentName, targetName);
});

$effect(() => {
    debug("feedback changed:");
    $inspect(feedback);
    if (showFeedbackForm) {
        dialogElement?.showModal();
    } else {
        debug("dialog closed, syncing feedback");
        setLocalFeedback(parentName, targetName, feedback!);
        dialogElement?.close();
    }
});

let showFeedbackForm = $state(false);
let dialogElement: HTMLDialogElement | null = $state(null);
let activeTextFieldType: string | null = $state("General");

function handleMouseDown(event: MouseEvent) {
    if (dialogElement) {
        const rect = dialogElement.getBoundingClientRect();
        const withinDialog = rect.top <= event.clientY
            && event.clientY <= rect.bottom
            && rect.left <= event.clientX
            && event.clientX <= rect.right;
        if (!withinDialog) {
            debug("clicking outside dialog, closing");
            showFeedbackForm = false;
        }
    }
}

const hasComments = $derived.by(() => {
    for (const comment of Object.keys(feedback!.data.comments)) {
        if (
            feedback!.data.comments[comment]
            && feedback!.data.comments[comment]?.trim() !== ""
        ) {
            return true;
        }
    }
    return false;
});
</script>

<button
    onclick={() => {
        showFeedbackForm = !showFeedbackForm;
    }}
    class="feedback-toggle"
>
    {#if feedback}
        {#if hasComments}
            <span style="display: inline-block; transform: scaleX(-1)">💬</span>
        {:else}
            <span style="transform: scaleX(1)">🗨️</span>
        {/if}
    {/if}
</button>

{#if feedback}
    {#if showFeedbackForm}
        <dialog
    bind:this={dialogElement}
    oncancel={() => showFeedbackForm = false}
    onmousedown={handleMouseDown}
    onclose={() => {
                debug("dialog closed, syncing feedback");
                setLocalFeedback(parentName, targetName, feedback!);
            }}
    class="feedback-dialog"
>
    <h3>Feedback for {targetName}</h3>
    <fieldset class="slider-feedback-group">
        <legend>Please rate the following</legend>
        <div class="slider-fields">
                    {#each Object.keys(feedback.data.ratings) as field}
                        <label for={field}>{field}</label>
                        <input
                            type="range"
                            name={field}
                            value={feedback!.data.ratings[field] ?? 2.5}
                            oninput={(e) => {
                                feedback!.data.ratings[field] = Number(e.currentTarget.value);
                            }}
                            id={field}
                            max={5}
                            min={0}
                            step={0.5}
                            list={`${field}-datalist`}
                            class:is-null={feedback.data.ratings[field] === null}
                        />
                        <datalist id={`${field}-datalist`}>
                            {#each [0, 1, 2, 3, 4, 5] as num}
                                <option value={num}>{num}</option>
                            {/each}
                        </datalist>
                        <span class="rating-value">{
                            feedback.data.ratings[field]?.toFixed(1) ?? ""
                        }</span>
                    {/each}
                </div>
    </fieldset>

    <!-- <RangeSet
        bind:boundValues={feedback.data.ratings}
        rangeSetProps={{
            qid: `${parentName}-${targetName}-ratings`,
            legendText: "Please rate the following",
            min: 0,
            max: 5,
            step: 0.5,
            tickInterval: 1,
            initialValue: 0,
            items: Object.keys(feedback.data.ratings).map((key) => ({
                itemId: key,
                nameLabel: key,
            })),
        }}
        onCommit={(qid, values) => {
            debug("ratings committed:", qid, values);
        }}
    /> -->

    <fieldset class="text-feedback-group">
                <legend>Comments</legend>
                <p>TELL ME YOUR THOUGHTS (or else)</p>
                <div class="text-field-types">
                    {#each Object.keys(feedback.data.comments) as type}
                        <button
                            type="button"
                            onclick={() => (activeTextFieldType = type)}
                            class:active={activeTextFieldType === type}
                        >
                            {type}
                            {#if feedback.data.comments[type]}
                                <span class="indicator-dot">●</span>
                            {/if}
                        </button>
                    {/each}
                </div>
                {#if activeTextFieldType}
                    <textarea
                        bind:value={feedback.data.comments[activeTextFieldType]}
                        name={activeTextFieldType}
                        id={activeTextFieldType}
                        placeholder={"Add your comments here..."}
                    ></textarea>
                {/if}
            </fieldset>
</dialog>
    {/if}
{/if}

<style>
.feedback-toggle {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 1.25rem;
    z-index: 1;
}

:global(:has(> .feedback-toggle)) {
    position: relative;
}

.feedback-dialog {
    display: flex;
    flex-direction: column;
    justify-self: center;
    align-self: center;
    gap: 1rem;
    align-items: center;
    border: none;
    border-radius: 1rem;
}

.slider-feedback-group {
    width: 50%;
    align-self: center;

    div.slider-fields {
        display: grid;
        grid-template-columns: auto 1fr 2.5rem;
        gap: 0.5rem;
    }

    input[type="range"].is-null {
        opacity: 0.3;
        filter: grayscale(100%);
    }
}

.text-feedback-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    div.text-field-types button {
        border-radius: 1rem;
    }

    .text-field-types {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;

        button.active {
            background-color: #0066cc;
            color: white;
        }
    }
}
</style>
