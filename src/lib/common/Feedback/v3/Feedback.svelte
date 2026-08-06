<script lang="ts">
import type { FeedbackProps } from "./interfaces.ts";
import { defaultRangeSetProps, FeedbackModel, PRE_SESSION_SYNC_MESSAGE } from "./model.svelte.ts";
import RangeSet from "../../Q-RangeSet/v3/RangeSet.svelte";

let { props }: { props: FeedbackProps } = $props();

const feedback = new FeedbackModel(props);

let showFeedbackDialog = $state(false);
let dialogElement: HTMLDialogElement | null = $state(null);

$effect(() => {
    // showFeedbackDialog ? openDialog() : closeDialog();
    if (showFeedbackDialog) openDialog();
});

function openDialog() {
    showFeedbackDialog = true;
    dialogElement?.showModal();
}

function closeDialog() {
    feedback.storeLocalState();
    void feedback.syncToDatabase();
    showFeedbackDialog = false;
    dialogElement?.close();
}

function handleMouseDown(event: MouseEvent) {
    if (dialogElement) {
        const rect = dialogElement.getBoundingClientRect();
        const outsideDialog = !(rect.top <= event.clientY
            && event.clientY <= rect.bottom
            && rect.left <= event.clientX
            && event.clientX <= rect.right);
        if (outsideDialog) {
            closeDialog();
        }
    }
}
</script>

<button onclick={() => {
    if (showFeedbackDialog) {
        closeDialog();
    } else {
        openDialog();
    }
}} class="feedback-toggle">
    {#if feedback.hasAnyFeedback}
        <span style="display: inline-block; transform: scaleX(-1)">💬</span>
    {:else}
        <span style="transform: scaleX(1)">🗨️</span>
    {/if}
</button>

{#if showFeedbackDialog}
    <dialog bind:this={dialogElement} onmousedown={handleMouseDown} class="feedback-dialog">
    <h3>Feedback for {feedback.targetName}</h3>

    <RangeSet
        bind:boundValues={feedback.ratings}
        rangeSetProps={defaultRangeSetProps(feedback.fid, Array.from(Object.keys(feedback.ratings)))}
        persistToLocalStorage={false}
        onCommit={(_, values) => {
                feedback.synced = false;
                feedback.storeLocalState();
            }}
    />

    <fieldset class="text-feedback-fieldset">
        {let activeCategory = $state("General")}
            <legend class="text-feedback-legend">Tell me your thoughts <em>(or else)</em></legend>
            <div class="text-field-categories">
                {#each Object.keys(feedback.comments) as category}
                    <button type="button"
                    onclick={() => (activeCategory = category)}
                    class="text-category-selector"
                    class:active={activeCategory === category}
                    title={feedback.comments[category] ?? ""}>
                        {category}
                        {#if feedback.comments[category]?.trim()}
                            <span class="sync-indicator">{feedback.synced ? "✓" : "●"}</span>
                        {/if}
                    </button>
                {/each}
            </div>
                <textarea
                name={activeCategory} id={activeCategory}
                placeholder="Add your thoughts here..."
                rows={4}
                bind:value={feedback.comments[activeCategory]}
                oninput={() => {
                    feedback.storeLocalState();
                    feedback.synced = false;
                }}></textarea>

                
        </fieldset>

    <div class="sync-controls">
                <button type="button" onclick={async () => {
                    // const result = await feedback.syncToDatabase();
                    // if (result.success) {
                    //     closeDialog();
                    // }
                    void feedback.syncToDatabase();
                }} disabled={feedback.synced || feedback.syncing || !feedback.hasAnyFeedback}>
                    {#if feedback.syncing}
                        Saving…
                    {:else if feedback.synced && feedback.hasAnyFeedback}
                        Saved
                    {:else}
                        Save
                    {/if}
                </button>
                {#if feedback.syncError}
                    <p
                        class:sync-pending={feedback.syncError === PRE_SESSION_SYNC_MESSAGE}
                        class:sync-error={feedback.syncError !== PRE_SESSION_SYNC_MESSAGE}
                    >
                        {feedback.syncError}
                    </p>
                {/if}
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
        color: light-dark(white, black);
        background-color: light-dark(oklch(100% 0 0), oklch(95% 0 0));
    }
}

.sync-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.sync-error {
    color: #cc0000;
    margin: 0;
}

.sync-pending {
    color: light-dark(oklch(40% 0.05 250), oklch(75% 0.05 250));
    margin: 0;
    text-align: center;
}
</style>
