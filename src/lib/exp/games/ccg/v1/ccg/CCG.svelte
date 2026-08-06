<script lang="ts">
import type {
    Action,
    GameInstanceParameters,
    GameInstanceRecord,
    GameSessionProps,
    PermutationCount,
} from "./types.d.ts";
import { CCG } from "./ccgLogic.ts";
import { blur, fade } from "svelte/transition";

let {
    gameInstanceRecords = $bindable([]),
    permutationCounts = $bindable([]),
    props,
}: {
    gameInstanceRecords?: GameInstanceRecord[];
    permutationCounts?: PermutationCount[];
    props: GameSessionProps;
} = $props();

if (!permutationCounts || permutationCounts.length === 0) {
    permutationCounts = CCG.initializePermutations(props);
}

console.log("Initial gameInstanceRecords:", $state.snapshot(gameInstanceRecords));
console.log("Initial permutationCounts:", $state.snapshot(permutationCounts));
console.log("Initial rounds played:", gameInstanceRecords ? gameInstanceRecords.length : 0);
// console.log("roundCount from permutationCounts:", CCG.countRoundsFromPermutations(permutationCounts));

let roundsPlayed: number = $derived(gameInstanceRecords ? gameInstanceRecords.length : 0);
let roundStartTime: number = $state(Date.now());

let currentPermutation: GameInstanceParameters = $derived(
    permutationCounts[roundsPlayed % permutationCounts.length].permutation,
);

function handleSelection(choice: string) {
    const elapsedSeconds = (Date.now() - roundStartTime) / 1000;
    roundStartTime = Date.now();
    permutationCounts[roundsPlayed % permutationCounts.length].count += 1;

    if (gameInstanceRecords) {
        // Update the game instance record with the current round's choices and outcome
        const gameInstanceRecordEntry = {
            rid: undefined, // filled in by database
            round_number: roundsPlayed + 1,
            player_1_uid: props.player1UID,
            player_1_avatar: currentPermutation.players[0].avatar.name,
            player_2_uid: undefined, // filled in by database
            player_2_avatar: currentPermutation.players[1].avatar.name,
            choice_option_1: currentPermutation.actions[0].key,
            choice_option_2: currentPermutation.actions[1].key,
            outcome_c1c1: currentPermutation.outcomes[0].value,
            outcome_c2c2: currentPermutation.outcomes[1].value,
            outcome_c1c2: currentPermutation.outcomes[2].value,
            outcome_c2c1: currentPermutation.outcomes[3].value,
            player_1_chose: choice,
            player_2_chose: undefined, // filled in by database
            player_1_payoff: undefined, // filled in by database
            player_2_payoff: undefined, // filled in by database
            time_elapsed_seconds: elapsedSeconds,
            matched_rid: undefined, // filled in by database
        };
        // gameInstanceRecords.push(gameInstanceRecordEntry);
        gameInstanceRecords = [...gameInstanceRecords, gameInstanceRecordEntry];
    }
}
</script>


<div class="ccg-wrapper">
    <div class="ccg" transition:fade={{ duration: 300 }}>

    {#if permutationCounts.length > 0 && (props.maxRounds) && (roundsPlayed < props.maxRounds)}
    <div class="ccg-frame">
        <img src={currentPermutation.players[0].avatar.path} alt="Player 1 Avatar (you)" class="player-avatar"/>
        <button class="choice-button" onclick={() => handleSelection(currentPermutation.actions[0].key)}>{@render action(currentPermutation.actions[0])}</button>
        <button class="choice-button" onclick={() => handleSelection(currentPermutation.actions[1].key)}>{@render action(currentPermutation.actions[1])}</button>
        <img src={currentPermutation.players[1].avatar.path} alt="Player 2 Avatar (other player)" class="player-avatar"/>
    </div>

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
                    <td>(<span class="your-payoff">{currentPermutation.outcomes[0].value[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[0].value[1]})</span></td>
                    <td>(<span class="your-payoff">{currentPermutation.outcomes[2].value[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[2].value[1]})</span></td>
                </tr>
                <tr>
                    <th>You choose <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span></th>
                    <td>(<span class="your-payoff">{currentPermutation.outcomes[3].value[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[3].value[1]})</span></td>
                    <td>(<span class="your-payoff">{currentPermutation.outcomes[1].value[0]}</span>, <span class="their-payoff">{currentPermutation.outcomes[1].value[1]})</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="ccg-round-number">Round {roundsPlayed + 1} / {props.maxRounds === Infinity ? "∞" : props.maxRounds}</div>
    
    {/if}

    </div>
</div>

{#snippet action(action: Action)}
    <span class="action-snippet" style="background-color: {action.color}">{action.value}</span>
{/snippet}


<style>
.ccg-wrapper {
    display: grid;
}
.ccg {
    display: flex;
    flex-direction: column;
    justify-self: center;
    gap: 1rem;
    grid-area: 1 / 1;
}

.ccg-frame {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0rem;
    padding: 0 0.5rem;
}

.player-avatar {
    height: 6rem;
    width: auto;
    border-radius: 10%;
}

.choice-button {
    display: flex;
    align-items: center;
    justify-content: center;
    --button-size: 5rem;
    height: var(--button-size);
    width: var(--button-size);
    font-size: 2.5rem;
    border: none;
    /* border: black solid 2px; */
    border-radius: 20%;
    padding: 0;
    cursor: pointer;
    &:hover {
        filter: brightness(0.8);
    }
}

.ccg-normal-form table {
    table-layout: fixed;
    border-collapse: collapse;
    width: auto;
}

.ccg-normal-form th,
.ccg-normal-form td {
    border: 1px solid black;
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
    border-radius: 20%;
    height: 1.5em;
    font-size: 1em;
    vertical-align: middle;
}

.ccg-round-number {
    text-align: right;
    margin-top: 0.5rem;
    margin-bottom: -1rem;
}
</style>
