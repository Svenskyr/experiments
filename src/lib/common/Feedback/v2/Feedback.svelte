<script lang="ts">
import debugLib from "debug";
import { page } from "$app/state";
import { untrack } from "svelte";
import type { FeedbackConfig } from "./interfaces.ts";
import { FeedbackModel } from "./Feedback.svelte.ts";
import RangeSet from "../../Q-RangeSet/v3/RangeSet.svelte";

const debug = debugLib("ccg-01:Feedback");

let { config }: { config: FeedbackConfig } = $props();

const feedback = untrack(() => new FeedbackModel(config));
const supabase = $derived(page.data.supabase);

let showFeedbackForm = $state(false);
let dialogElement: HTMLDialogElement | null = $state(null);
let activeCategoryId: string | null = $state(null);

$effect(() => {
    if (showFeedbackForm) {
        dialogElement?.showModal();
    }
});

function openDialog() {
    if (activeCategoryId === null) {
        activeCategoryId = feedback.commentCategories[0]?.categoryId ?? null;
    }
    showFeedbackForm = true;
}

async function closeDialog() {
    debug("dialog closed, persisting feedback");
    showFeedbackForm = false;
    await feedback.persist(supabase);
    dialogElement?.close();
}

async function syncFeedback() {
    await feedback.syncToDatabase(supabase);
}

function handleMouseDown(event: MouseEvent) {
    if (dialogElement) {
        const rect = dialogElement.getBoundingClientRect();
        const withinDialog = rect.top <= event.clientY
            && event.clientY <= rect.bottom
            && rect.left <= event.clientX
            && event.clientX <= rect.right;
        if (!withinDialog) {
            debug("clicking outside dialog, closing");
            void closeDialog();
        }
    }
}
</script>

<button
    onclick={() => {
        if (showFeedbackForm) {
            void closeDialog();
        } else {
            openDialog();
        }
    }}
    class="feedback-toggle local-styles"
>
    {#if feedback.hasComments}
        <span style="display: inline-block; transform: scaleX(-1)">💬</span>
    {:else}
        <span style="transform: scaleX(1)">🗨️</span>
    {/if}
</button>

{#if showFeedbackForm}
    <dialog
    bind:this={dialogElement}
    oncancel={(e) => {
            e.preventDefault();
            void closeDialog();
        }}
    onmousedown={handleMouseDown}
    class="feedback-dialog"
>
    <h3>Feedback for {feedback.targetName}</h3>

    <RangeSet
        bind:boundValues={feedback.ratings}
        rangeSetProps={feedback.rangeSetProps}
        persistToLocalStorage={false}
        onCommit={(_, values) => feedback.onRatingsCommit(values)}
    />

    <fieldset class="text-feedback-group">
            <legend>Comments</legend>
            <p>TELL ME YOUR THOUGHTS (or else)</p>
            <div class="text-field-types">
                {#each feedback.commentCategories as category (category.categoryId)}
                    <button
                        type="button"
                        onclick={() => (activeCategoryId = category.categoryId)}
                        class:active={activeCategoryId === category.categoryId}
                    >
                        {category.label}
                        {#if feedback.comments[category.categoryId]?.trim()}
                            <span class="indicator-dot">●</span>
                        {/if}
                        {#if feedback.isSynced}
                            <span class="sync-indicator" title="Synced to server">✓</span>
                        {/if}
                    </button>
                {/each}
            </div>
            {#if activeCategoryId}
                <textarea
                    value={feedback.comments[activeCategoryId] ?? ""}
                    oninput={(e) => {
                        feedback.setComment(
                            activeCategoryId!,
                            e.currentTarget.value,
                        );
                    }}
                    name={activeCategoryId}
                    id={activeCategoryId}
                    placeholder="Add your comments here..."
                ></textarea>
            {/if}
        </fieldset>

    <div class="sync-controls">
            {#if feedback.syncError}
                <p class="sync-error">{feedback.syncError}</p>
            {/if}
            <button
                type="button"
                onclick={() => void syncFeedback()}
                disabled={feedback.syncing || !feedback.needsSync}
            >
                {#if feedback.syncing}
                    Saving…
                {:else if feedback.isSynced}
                    Saved
                {:else}
                    Save feedback
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

.text-feedback-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    div.text-field-types button {
        border-radius: 0.5rem;
        border: 1px solid light-dark(oklch(50% 0 0), oklch(0% 0 0));
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

.sync-indicator {
    margin-left: 0.25rem;
}
</style>
