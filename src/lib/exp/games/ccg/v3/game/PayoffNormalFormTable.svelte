<script lang="ts">
import type { Action, Outcome } from "./gameState.ts";

let {
    actions,
    outcomes,
    selectedChoice = null,
}: {
    actions: [Action, Action];
    outcomes: Outcome[];
    selectedChoice?: string | null;
} = $props();
</script>

{#snippet actionSnippet(action: Action)}
    <span class="action-snippet" style="background-color: {action.color}">{action.value}</span>
{/snippet}

{#snippet payoffCell(yourAction: Action, theirAction: Action, outcome: Outcome)}
    <td class="payoff-cell">
        <span class="payoff-cell-actions">
            <span class="action-snippet-in-table">{@render actionSnippet(yourAction)}</span>
            <span class="action-snippet-in-table">{@render actionSnippet(theirAction)}</span>
        </span>
        (<span class="your-payoff">{outcome.payoffs[0]}</span>, <span class="their-payoff">{outcome.payoffs[1]})</span>
    </td>
{/snippet}

<div class="ccg-normal-form">
    <table>
        <thead>
            <tr>
                <th class="nf-corner" aria-hidden="true"></th>
                <th>They choose <span class="action-snippet-in-table">{@render actionSnippet(actions[0])}</span></th>
                <th>They choose <span class="action-snippet-in-table">{@render actionSnippet(actions[1])}</span></th>
            </tr>
        </thead>
        <tbody>
            <tr
                class:you-choose-selected={selectedChoice === actions[0].key}
                class:you-choose-faded={selectedChoice === actions[1].key}
            >
                <th>You choose <span class="action-snippet-in-table">{@render actionSnippet(actions[0])}</span></th>
                {@render payoffCell(actions[0], actions[0], outcomes[0])}
                {@render payoffCell(actions[0], actions[1], outcomes[2])}
            </tr>
            <tr
                class:you-choose-selected={selectedChoice === actions[1].key}
                class:you-choose-faded={selectedChoice === actions[0].key}
            >
                <th>You choose <span class="action-snippet-in-table">{@render actionSnippet(actions[1])}</span></th>
                {@render payoffCell(actions[1], actions[0], outcomes[3])}
                {@render payoffCell(actions[1], actions[1], outcomes[1])}
            </tr>
        </tbody>
    </table>
</div>

<style>
.ccg-normal-form table {
    --nf-cell-border: light-dark(oklch(0% 0 0), oklch(50% 0 0));
    --nf-row-highlight-border: light-dark(oklch(0% 0 0), oklch(70% 0 0));
    --nf-row-highlight-bg: light-dark(oklch(85% 0 0), oklch(20% 0 0));
    table-layout: fixed;
    border-collapse: collapse;
    width: auto;
}

.ccg-normal-form th,
.ccg-normal-form td {
    border: 1px solid var(--nf-cell-border);
    padding: 0.5rem;
    text-align: center;
    font-size: 1.1rem;
    font-weight: normal;
}

.ccg-normal-form th.nf-corner {
    border: none;
}

.ccg-normal-form tr.you-choose-selected th {
    font-weight: bold;
}

.ccg-normal-form tr.you-choose-selected > :is(th, td) {
    background-color: var(--nf-row-highlight-bg);
    border-top: 2px solid var(--nf-row-highlight-border);
    border-bottom: 2px solid var(--nf-row-highlight-border);
}

.ccg-normal-form tr.you-choose-selected > :first-child {
    border-left: 2px solid var(--nf-row-highlight-border);
}

.ccg-normal-form tr.you-choose-selected > :last-child {
    border-right: 2px solid var(--nf-row-highlight-border);
}

.ccg-normal-form tr.you-choose-faded {
    opacity: 0.4;
}

.payoff-cell-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    margin-inline-end: 0.35rem;
    vertical-align: middle;
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
</style>
