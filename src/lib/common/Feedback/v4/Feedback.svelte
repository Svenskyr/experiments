<script lang="ts">
import debugLib from "debug";
const debug = debugLib("Feedback");
import {
    captureRatingsRangeSet,
    type FeedbackData,
    hasFeedback,
    ratingsRangeSet,
} from "$lib/common/Feedback/v4/Feedback.ts";
import type { RangeSetQuestion as RSQ } from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion";
import RangeSetQuestion from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.svelte";

let { data = $bindable<FeedbackData>(), save, sync }: {
    data: FeedbackData;
    save?: (data: FeedbackData) => void;
    sync?: (data: FeedbackData) => void;
} = $props();

let ratingsRangeSetQuestion: RSQ = $state(
    ratingsRangeSet(data.page, data.label, data.ratings),
);

let showFeedbackDialog = $state(false);
let dialogElement: HTMLDialogElement | undefined = $state(undefined);

$effect(() => {
    if (showFeedbackDialog) openDialog();
});

function openDialog() {
    showFeedbackDialog = true;
    dialogElement?.showModal();
}

function closeDialog() {
    showFeedbackDialog = false;
    save?.(data);
    if (hasFeedback(data) && !data.synced) {
        void sync?.(data);
        data.synced = true;
    }
    dialogElement?.close();
}

function handleMouseDown(event: MouseEvent) {
    if (dialogElement) {
        const rect = dialogElement.getBoundingClientRect();
        const outsideDialog = !(rect.top <= event.clientY
            && event.clientY <= rect.bottom
            && rect.left <= event.clientX
            && event.clientX <= rect.right);
        if (outsideDialog) closeDialog();
    }
}
</script>

<button onclick={() => { if (showFeedbackDialog) closeDialog(); else openDialog(); }}
    class="feedback-toggle">
{#if hasFeedback(data)}
    <span style="display: inline-block; transform: scaleX(-1)">💬</span>
{:else}
    <span style="transform: scaleX(1)">🗨️</span>
{/if}
</button>

{#if showFeedbackDialog}
    <dialog bind:this={dialogElement} onmousedown={handleMouseDown} class="feedback-dialog">
    <h3>Feedback for {data.label}</h3>
    <RangeSetQuestion bind:question={ratingsRangeSetQuestion}
        save={(question) => captureRatingsRangeSet(data, question, save)}
    />

    <fieldset class="text-feedback-fieldset">
            {let activeCategory: string = $state("General")}
            <legend class="text-feedback-legend">Share your thoughts</legend>
            <div class="text-field-categories">
                {#each Object.keys(data.comments) as category}
                <button type="button"
                    onclick={() => (activeCategory = category)}
                    class="text-category-selector"
                    class:active={activeCategory === category}
                    title={data.comments[category] ?? ""}>
                        {category}
                        {#if data.comments[category]?.trim()}
                            <span class="sync-indicator">{data.synced ? "✓" : "●"}</span>
                        {/if}
                        </button>
                    {/each}
                </div>
                <textarea
                    name={activeCategory} id={activeCategory}
                    placeholder="Add your thoughts here..."
                    rows={4}
                    bind:value={data.comments[activeCategory]}
                    oninput={() => {
                        save?.(data);
                        data.synced = false;
                    }}></textarea>
            </fieldset>

    <div class="sync-controls">
        <button type="button"
            onclick={() => {
                        if (hasFeedback(data) && !data.synced) {
                            save?.(data);
                            sync?.(data);
                            data.synced = true;
                        }
                    }}
            disabled={data.synced || !hasFeedback(data)}>
                    {#if data.synced && hasFeedback(data)}
                        Saved
                    {:else}
                        Save
                    {/if}
                </button>
    </div>
</dialog>
{/if}

<style>
.feedback-toggle {
    position: absolute;
    bottom: 0;
    right: 0;
    border: none;
    background-color: transparent;
    cursor: pointer;
    z-index: 1;
    font-size: 1rem;
    &:hover:not(.disabled) {
        font-size: 1.1rem;
    }
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
    width: 30em;
}

.text-feedback-fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.text-feedback-legend {
    font-size: 1.2em;
}

.text-field-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25em;
    justify-content: center;
}

.text-category-selector {
    border-radius: 0.5em;
    border: 1px solid light-dark(oklch(50% 0 0), oklch(0% 0 0));
    &.active {
        font-weight: bold;
        color: light-dark(black, black);
        background-color: light-dark(oklch(100% 0 0), oklch(95% 0 0));
    }
}

.sync-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}
</style>
