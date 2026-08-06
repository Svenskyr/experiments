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

// console.log("Initial gameInstanceRecords:", $state.snapshot(gameInstanceRecords));
// console.log("Initial permutationCounts:", $state.snapshot(permutationCounts));
// console.log("Initial rounds played:", gameInstanceRecords ? gameInstanceRecords.length : 0);
// console.log("roundCount from permutationCounts:", CCG.countRoundsFromPermutations(permutationCounts));

let prediction_choice_1: number = $state(50);
let prediction_choice_2: number = $derived(100 - prediction_choice_1);
// let prediction_choice_2: number = $state(50);
let selectedChoice: string | null = $state(null);

let roundsPlayed: number = $derived(gameInstanceRecords ? gameInstanceRecords.length : 0);
let roundStartTime: number = $state(Date.now());

let currentPermutation: GameInstanceParameters = $derived(
    permutationCounts[roundsPlayed % permutationCounts.length].permutation,
);

function handleSelection(choice: string) {
    selectedChoice = choice;
}

function handleSubmission(choice: string) {
    if (!selectedChoice) return; // Prevent submission without selection

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
            prediction_choice_1: prediction_choice_1,
        };
        // gameInstanceRecords.push(gameInstanceRecordEntry);
        gameInstanceRecords = [...gameInstanceRecords, gameInstanceRecordEntry];
    }

    prediction_choice_1 = 50;
    selectedChoice = null;
}

function EnterKeyHandler(e: KeyboardEvent) {
    if (e.key === "Enter") {
        e.preventDefault();
        if (selectedChoice) {
            handleSubmission(selectedChoice);
        }
    }
}

function handlePredictionInput(choice: string, value: number) {
    // Manual handling of prediction inputs to prevent inputs from locking up
    // Update: Still locking up. Might be an issue with the browser or range input itself.
    switch (choice) {
        case currentPermutation.actions[0].key:
            prediction_choice_1 = value;
            prediction_choice_2 = 100 - value;
            break;
        case currentPermutation.actions[1].key:
            prediction_choice_2 = value;
            prediction_choice_1 = 100 - value;
            break;
    }
}
</script>


<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ccg-wrapper" onkeydown={EnterKeyHandler}>
    <div class="ccg" transition:fade={{ duration: 300 }}>

    {#if permutationCounts.length > 0 && (props.maxRounds) && (roundsPlayed < props.maxRounds)}
    <div class="ccg-frame">
        <img src={currentPermutation.players[0].avatar.path} alt="Player 1 Avatar (you)" class="player-avatar"/>
        <button 
            class="choice-button" 
            class:selected={selectedChoice === currentPermutation.actions[0].key}
            onclick={() => handleSelection(currentPermutation.actions[0].key)}>{@render action(currentPermutation.actions[0])}</button>
        <button 
            class="choice-button" 
            class:selected={selectedChoice === currentPermutation.actions[1].key}
            onclick={() => handleSelection(currentPermutation.actions[1].key)}>{@render action(currentPermutation.actions[1])}</button>
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

    <br>

    <div class="prediction">
    <div class="prediction-question-text">Your prediction about how other players choose:</div>
    <div class="prediction-labels">
        <div class="prediction-label-item" style="width: {prediction_choice_1}%; text-align: center;">
            <div class="label-content">
                {prediction_choice_1}% <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span>
            </div>
        </div>
        <div class="prediction-label-item" style="width: {100 - prediction_choice_1}%; text-align: center;">
            <div class="label-content">
                {100 - prediction_choice_1}% <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span>
            </div>
        </div>
    </div>
        <input type="range"
            min=0
            max=100
            step=1
            bind:value={prediction_choice_1}
            style={`
                width: 100%;
                --slider-thumb-color: var(--action-neutral2-color);
                --track-color-left: ${currentPermutation.actions[0].color};
                --track-color-right: ${currentPermutation.actions[1].color};
                --fill-percent: ${prediction_choice_1}%;
                `}
        />
    </div>

    <!-- Maybe add a warning if selection and prediction don't make sense together. -->
     <!-- For example, if you select option 1 and predict less than 50% for it, then you should be picking option 2. -->
    {#if selectedChoice === currentPermutation.actions[0].key && prediction_choice_1 < 45}
    <div class="prediction-warning">
        <span class="prediction-warning-icon">⚠️</span>
        <p class="prediction-warning-text">Your prediction says you expect more people to choose 
            <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span>,
            but you selected <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span>.</p>
    </div>
    {/if}
    {#if selectedChoice === currentPermutation.actions[1].key && prediction_choice_1 > 55}
    <div class="prediction-warning">
        <span class="prediction-warning-icon">⚠️</span>
        <p>Your prediction says you expect more people to choose 
            <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span>,
            but you selected <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span>.</p>
    </div>
    {/if}

    <!-- <div class="prediction">
    <div class="prediction-question-text">Your prediction about how other players choose:</div>
    <div class="prediction-labels">
        <div class="prediction-label-item" style="width: {prediction_choice_2}%; text-align: center;">
            <div class="label-content">
                {prediction_choice_2}% <span class="action-snippet-in-table">{@render action(currentPermutation.actions[1])}</span>
            </div>
        </div>
        <div class="prediction-label-item" style="width: {100 - prediction_choice_2}%; text-align: center;">
            <div class="label-content">
                {100 - prediction_choice_2}% <span class="action-snippet-in-table">{@render action(currentPermutation.actions[0])}</span>
            </div>
        </div>
    </div>
        <input type="range"
            min=0
            max=100
            step=1
            value={prediction_choice_2}
            oninput={(e) => { prediction_choice_1 = 100 - e.currentTarget.valueAsNumber; }}
            style={`
                width: 100%;
                --slider-thumb-color: var(--action-neutral2-color);
                --track-color-left: ${currentPermutation.actions[1].color};
                --track-color-right: ${currentPermutation.actions[0].color};
                --fill-percent: ${prediction_choice_2}%;
                `}
        />
    </div> -->

    <button 
        class="submit-choice" 
        class:disabled={!selectedChoice}
        onclick={() => handleSubmission(selectedChoice || prediction_choice_1.toString())}>Submit Choice</button>
    
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
    transition: border-color 0.2s, box-shadow 0.2s;
    &:hover {
        filter: brightness(0.8);
    }
    &.selected {
        border: 4px solid black;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
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

    /* Chromium shits itself if it sees a firefox specifier */
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

    /* Chromium shits itself if it sees a firefox specifier */
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
    align-self: center;
    padding: 0.5rem 1rem;
    font-size: 1.2rem;
    border-radius: 5px;
    background-color: var(--action-neutral2-color);
    cursor: pointer;
    transition: opacity 0.2s, filter 0.2s;
    &:hover {
        filter: brightness(0.9);
    }
    &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        &:hover {
            filter: none;
        }
    }
}

.prediction-warning {
    display: flex;
    align-self: center;
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
</style>
