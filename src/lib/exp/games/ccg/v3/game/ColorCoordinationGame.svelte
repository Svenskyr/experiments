<script lang="ts">
import HintBox from "$lib/common/HintBox/v1/HintBox.svelte";
import { fade, scale } from "svelte/transition";
import {
    type Action,
    type GameSession,
    getCurrentPermutation,
    isGameComplete,
    shouldSync,
    submitRound,
} from "./gameState.ts";

let {
    session = $bindable<GameSession>(),
    save,
    sync,
}: {
    session: GameSession;
    save?: (session: GameSession) => void;
    sync?: (session: GameSession) => void;
} = $props();

const currentPermutation = $derived(getCurrentPermutation(session));
let selectedChoice: string | null = $state(null);
let predictionChoice1: number = $state(50);
let hasPredictionBeenMade: boolean = $state(false);
let formEl: HTMLFormElement | undefined = $state();

let roundStartTime: number = $state(Date.now());

/** Swap these to try different round-change animations on the game frame. */
const roundFrameTransitionIn = fade;
const roundFrameTransition = { duration: 500 };

const canSubmit = $derived(
    selectedChoice !== null
        && (!session.config.showPredictionControls || hasPredictionBeenMade),
);

function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const choice = selectedChoice;
    if (!canSubmit || choice === null) return;

    const elapsedSeconds = (Date.now() - roundStartTime) / 1000;
    submitRound(session, choice, predictionChoice1, elapsedSeconds);
    save?.(session);
    if (shouldSync(session) || isGameComplete(session)) {
        sync?.(session);
    }
    nextRound();
}

function nextRound() {
    selectedChoice = null;
    predictionChoice1 = 50;
    hasPredictionBeenMade = false;
    roundStartTime = Date.now();
}

function handlePredictionInput() {
    hasPredictionBeenMade = true;
}

function handleChoiceKeydown(e: KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== " ") return;

    const input = e.currentTarget as HTMLInputElement;
    if (e.key === " " && !input.checked) return;

    if (!canSubmit) return;

    e.preventDefault();
    formEl?.requestSubmit();
}
</script>

{#if !isGameComplete(session)}
<div class="ccg-wrapper">
    <form
        class="ccg"
        bind:this={formEl}
        transition:fade={{ duration: 300 }}
        onsubmit={handleSubmit}
    >
        <HintBox label="How to play">
            {#snippet body()}
                <p>Select a choice by clicking on it.</p>
                {#if session.config.showPredictionControls}
                    <p>Make a prediction about how other players will choose by dragging the slider. If the slider gets stuck, click on it directly or refresh the page.</p>
                {/if}
            {/snippet}
        </HintBox>
        {#key session.permutationTracker.roundsPlayed}
            <div
                class="ccg-frame-keyed"
                in:roundFrameTransitionIn={roundFrameTransition}
            >
                {@render gameFrame()}
            </div>
        {/key}
        {#if session.config.showPredictionControls}
            {@render predictionControls()}
            {@render predictionWarnings()}
        {/if}
        {#if session.config.useSubmitButton}
            {@render submitButton()}
        {:else}
            <button type="submit" hidden>Submit</button>
        {/if}
        {#if session.config.showPayoffTable}
            {@render payoffTable()}
        {/if}
    </form>
    {#if session.config.maxRounds !== Infinity}
        {@render roundNumber()}
    {/if}
</div>
{/if}

{#snippet action(action: Action)}
    <span class="action-snippet" style="background-color: {action.color}">{action.value}</span>
{/snippet}

{#snippet gameFrame()}
    <fieldset class="ccg-frame">
    <legend class="visually-hidden">Your choice</legend>
    <img src={currentPermutation.avatars[0].path} alt="Player 1 Avatar (you)"
        class="player-avatar" />
    <label
        class="choice-button"
        class:selected={selectedChoice === currentPermutation.actions[0].key}
    >
            <input
                type="radio"
                name="choice"
                class="choice-input"
                value={currentPermutation.actions[0].key}
                bind:group={selectedChoice}
                onkeydown={handleChoiceKeydown}
            />
            {@render action(currentPermutation.actions[0])}
        </label>
    <label
        class="choice-button"
        class:selected={selectedChoice === currentPermutation.actions[1].key}
    >
            <input
                type="radio"
                name="choice"
                class="choice-input"
                value={currentPermutation.actions[1].key}
                bind:group={selectedChoice}
                onkeydown={handleChoiceKeydown}
            />
            {@render action(currentPermutation.actions[1])}
        </label>
    <img src={currentPermutation.avatars[1].path} alt="Player 2 Avatar (other player)"
        class="player-avatar" />
</fieldset>
{/snippet}

{#snippet payoffTable()}
    <div class="ccg-normal-form">
    <table>
        <thead>
            <tr>
                <th></th>
                <th>They choose <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span></th>
                <th>They choose <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <th>You choose <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span></th>
                <td>(<span class="your-payoff">{currentPermutation.outcomes[0].payoffs[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[0].payoffs[1]})</span></td>
                <td>(<span class="your-payoff">{currentPermutation.outcomes[2].payoffs[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[2].payoffs[1]})</span></td>
            </tr>
            <tr>
                <th>You choose <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span></th>
                <td>(<span class="your-payoff">{currentPermutation.outcomes[3].payoffs[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[3].payoffs[1]})</span></td>
                <td>(<span class="your-payoff">{currentPermutation.outcomes[1].payoffs[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[1].payoffs[1]})</span></td>
            </tr>
        </tbody>
    </table>
</div>
{/snippet}

{#snippet roundNumber()}
    {#key session.permutationTracker.roundsPlayed}
        <div
    class="ccg-round-number"
    in:scale={{ duration: 250, start: 1.2, opacity: 1 }}
>
            Round {session.permutationTracker.roundsPlayed + 1} / {session.config.maxRounds === Infinity ? "∞" : session.config.maxRounds}
        </div>
    {/key}
{/snippet}

{#snippet predictionControls()}
    <div class="prediction">
    <div class="prediction-question-text">Your prediction about how other players choose:</div>
    <div class="prediction-input" class:prediction-unmade={!hasPredictionBeenMade}>
        <div class="prediction-labels">
            <div class="prediction-label-item"
                style="width: {predictionChoice1}%; text-align: center;">
                <div class="label-content">
                    {predictionChoice1}% <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span>
                </div>
            </div>
            <div class="prediction-label-item"
                style="width: {100 - predictionChoice1}%; text-align: center;">
                <div class="label-content">
                    {100 - predictionChoice1}% <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span>
                </div>
            </div>
        </div>
        <input
            type="range"
            name="prediction"
            min=0
            max=100
            step=1
            bind:value={predictionChoice1}
            oninput={handlePredictionInput}
            style={`
                width: 100%;
                --slider-thumb-color: var(--action-neutral2-color);
                --track-color-left: ${currentPermutation.actions[0].color};
                --track-color-right: ${currentPermutation.actions[1].color};
                --fill-percent: ${predictionChoice1}%;
                `}
        />
    </div>
</div>
{/snippet}

{#snippet predictionWarning(expectedAction: Action, selectedAction: Action)}
    <div class="prediction-warning-block">
    <div class="prediction-warning">
        <span class="prediction-warning-icon">⚠️</span>
        <p class="prediction-warning-text">Your prediction says you expect more people to choose
                <span class="action-snippet-in-table">{@render action(expectedAction)}</span>,
                but you selected <span class="action-snippet-in-table">{@render action(selectedAction)}</span>.</p>
    </div>
    <p class="prediction-warning-text-certainty">Are you certain?</p>
</div>
{/snippet}

{#snippet predictionWarnings()}
    {#if selectedChoice === currentPermutation.actions[0].key && predictionChoice1 < 45}
        {@render predictionWarning(currentPermutation.actions[1], currentPermutation.actions[0])}
    {/if}
    {#if selectedChoice === currentPermutation.actions[1].key && predictionChoice1 > 55}
        {@render predictionWarning(currentPermutation.actions[0], currentPermutation.actions[1])}
    {/if}
{/snippet}

{#snippet submitButton()}
    <button type="submit" class="submit-choice exp-default-button" class:disabled={!canSubmit}
    disabled={!canSubmit}
    style="background-color: {selectedChoice ? `${currentPermutation.actions[selectedChoice === currentPermutation.actions[0].key ? 0 : 1].color}` : 'transparent'}">
        Submit
    </button>
{/snippet}

<style>
.ccg-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-right: 1.5rem;
}
.ccg {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: visible;
}

.ccg-frame {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0rem;
    padding: 0 0.5rem;
    border: none;
    margin: 0;
    min-width: 0;
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.choice-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.player-avatar {
    height: 6rem;
    width: auto;
    border-radius: 10%;
}

.choice-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    --button-size: 5rem;
    height: var(--button-size);
    width: var(--button-size);
    font-size: 2.5rem;
    border: 2px solid transparent;
    border-radius: 22%;
    padding: 0;
    cursor: pointer;
    &:hover:not(.selected) {
        filter: brightness(0.8);
    }
    &.selected {
        border: 2px solid black;
        box-shadow: 0 0 5px oklch(0% 0 0 / 0.3);
    }
}

.ccg-normal-form table {
    table-layout: fixed;
    border-collapse: collapse;
    width: auto;
}

.ccg-normal-form th,
.ccg-normal-form td {
    border: 1px solid light-dark(oklch(0% 0 0), oklch(50% 0 0));
    padding: 0.5rem;
    text-align: center;
    font-size: 1.1rem;
    font-weight: normal;
}

.your-payoff {
    font-weight: normal;
    text-decoration-line: underline;
}

.action-snippet {
    display: inline-flex;
    aspect-ratio: 1 / 1;
    height: 100%;
    font-size: 1em;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    vertical-align: middle;
    border: solid black 2px;
    border-radius: 20%;
    box-sizing: border-box;
}

.action-snippet-in-table {
    display: inline-flex;
    aspect-ratio: 1 / 1;
    border-radius: 22%;
    height: 1.5em;
    font-size: 1em;
    vertical-align: middle;
}

.ccg-round-number {
    text-align: center;
    margin-top: 1rem;
    font-size: 0.8rem;
}

.prediction-input.prediction-unmade {
    opacity: 0.4;
}

.prediction-question-text {
    font-size: 1.2em;
    margin-bottom: 0.5rem;
}

.prediction-labels {
    display: flex;
    justify-content: center;
    width: 100%;
    overflow: visible;
    white-space: nowrap;
}

.prediction-label-item {
    position: relative;
    height: 1.5rem;
}

.label-content {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
}

input[type='range'] {
    appearance: none;
    margin: 0.5rem 0;
    cursor: pointer;
    background: transparent;
    box-sizing: border-box;

    &::-webkit-slider-runnable-track {
        height: 1.5rem;
        background: linear-gradient(
            to right,
            var(--track-color-left) 0%,
            var(--track-color-left) var(--fill-percent),
            var(--track-color-right) var(--fill-percent),
            var(--track-color-right) 100%
        );
        border-radius: 0.5rem;
        border: 1px solid #ccc;
    }

    &::-webkit-slider-thumb {
        appearance: none;
        width: 0.8rem;
        height: 2rem;
        background: white;
        border: 2px solid black;
        border-radius: 10%;
        margin-top: calc((1.5rem - 2rem) / 2);
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    &::-moz-range-track {
        height: 1.5rem;
        background: linear-gradient(
            to right,
            var(--track-color-left) 0%,
            var(--track-color-left) var(--fill-percent),
            var(--track-color-right) var(--fill-percent),
            var(--track-color-right) 100%
        );
        border-radius: 0.5rem;
        border: 1px solid #ccc;
    }

    &::-moz-range-thumb {
        width: 0.5rem;
        height: 2rem;
        background: white;
        border: 2px solid black;
        border-radius: 10%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
}

.submit-choice {
    height: 2rem;
    width: fit-content;
    align-self: center;
    font-weight: bold;
    font-size: 1rem;
    &.disabled {
        font-weight: normal;
        background-color: transparent;
    }
}

.prediction-warning-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
    gap: 0.5rem;
}

.prediction-warning {
    display: flex;
    align-items: center;
    gap: 1rem;
    max-width: 24rem;
}

.prediction-warning-icon {
    font-size: 1.5rem;
}

.prediction-warning-text {
    font-size: 1rem;
}

.prediction-warning-text-certainty {
    align-self: stretch;
    text-align: center;
    font-size: 1rem;
}
</style>
