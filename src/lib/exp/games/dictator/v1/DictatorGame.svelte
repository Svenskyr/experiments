<script lang="ts">
import type { DictatorGamePublic, DictatorGameResponse } from "./DictatorGame.ts";
import { amounts, confirmDecision, kept, selectAmount } from "./DictatorGame.ts";

let {
    id,
    config,
    response = $bindable<DictatorGameResponse>(),
    oncommit,
}: {
    id: string; // Prefix for input IDs and the input group name
    config: DictatorGamePublic;
    response: DictatorGameResponse;
    oncommit?: (() => void) | undefined;
} = $props();

const keptPoints = $derived(kept(config, response));

function points(count: number): string {
    return count === 1 ? "1 point" : `${count} points`;
}

/** Run a command; commit only if it changed the response. */
function commit(command: () => void) {
    const before = JSON.stringify(response);
    command();
    if (JSON.stringify(response) !== before) oncommit?.();
}

function handleSelectAmount(amount: number) {
    commit(() => selectAmount(config, response, amount));
}

function handleConfirm() {
    commit(() => confirmDecision(config, response));
}
</script>

<fieldset class="dictator-game" disabled={response.confirmed}>
    <legend class="legend-text">{config.questionText}</legend>

    <div class="amounts">
        {#each amounts(config) as amount (amount)}
            {const inputId = `${id}-amount-${amount}`}
            <label for={inputId} class="amount" class:selected={response.given === amount}>
                <input
                    id={inputId}
                    name={id}
                    type="radio"
                    value={amount}
                    checked={response.given === amount}
                    onchange={() => handleSelectAmount(amount)}
                />
                {amount}
            </label>
        {/each}
    </div>

    <p class="split" aria-live="polite">
        {#if response.given === null || keptPoints === null}
            Select an amount.
        {:else}
            You keep {points(keptPoints)}. The other player receives {points(response.given)}.
        {/if}
    </p>

    {#if response.confirmed}
        <p class="split">Your decision is final.</p>
    {:else}
        <button
            type="button"
            class="confirm-button exp-default-button"
            disabled={response.given === null}
            onclick={handleConfirm}
        >Confirm decision</button>
    {/if}
</fieldset>

<style>
.dictator-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.5em;
}

.legend-text {
    font-size: 1.2em;
    padding: 0 0.25em;
}

.amounts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25em;
}

.amount {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25em;
    min-width: 2.5em;
    padding: 0.5em 0.25em;
    border-radius: 0.5em;
    user-select: none;
    &:hover {
        background-color: light-dark(oklch(0.8 0 0), oklch(0.4 0 0));
    }
    &.selected {
        font-weight: bold;
        background-color: light-dark(oklch(0.85 0 0), oklch(0.35 0 0));
    }
}

.dictator-game:disabled .amount {
    pointer-events: none;
    &:not(.selected) {
        opacity: 0.5;
    }
}

.split {
    text-align: center;
}

.confirm-button {
    font-weight: bold;
    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
}
</style>
