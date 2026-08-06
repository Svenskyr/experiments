<script lang="ts">
/* General */
import { PUBLIC_ENV } from "$env/static/public";
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+game_play").debug;
import FeedbackWrapper from "$experiments/ccg-01/_components/FeedbackWrapper.svelte";
import RecordedGame from "$experiments/ccg-01/_components/ColorCoordinationGame/RecordedGame.svelte";
import {
    recordedGameConfig,
    recordedMaxRounds,
    recordedShuffleSeed,
} from "$experiments/ccg-01/_components/ColorCoordinationGame/GameConfig.ts";

/* expState */
import { getExpState } from "$experiments/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

/* syncHandler */
import { getSyncHandler } from "$experiments/ccg-01/_syncHandler/v3/SyncHandler.ts";
const syncHandler = getSyncHandler();

/* Page navigation */
import { requestNextPageCookie } from "$experiments/ccg-01/_state/Client.ts";
import { goto } from "$app/navigation";
import { maxPage } from "$experiments/ccg-01/_state/Pages.ts";
import NavigationBarWrapper from "$experiments/ccg-01/_components/NavigationBarWrapper.svelte";

/* Page game */
import { load, save, sync as syncGameRounds } from "$experiments/ccg-01/_database/CCGGameDBM.ts";
import { type GameSession, newGameSession } from "$lib/exp/games/ccg/v3/game/gameState.ts";
import { fillRemainingRoundsWithRandomChoices } from "./devFillRemainingRounds.ts";

const maxRounds = $derived(recordedMaxRounds(expState.session.role));

let session = $state<GameSession>(
    newGameSession(
        recordedGameConfig(getExpState()),
        load(),
        recordedShuffleSeed(getExpState()),
    ),
);
let pageCompleted = $derived(
    (session?.permutationTracker.roundsPlayed ?? 0) >= maxRounds,
);
$effect(() => {
    if (pageCompleted) {
        syncGameRounds(syncHandler);
        (async () => {
            const { error } = await requestNextPageCookie(expState);
            if (error) {
                console.error(`error requesting next page cookie: ${JSON.stringify(error)}`);
            }
            goto(`${maxPage(expState.pages)}`, { replaceState: true });
        })();
    }
});

function handleDevFillRemainingRounds() {
    const filled = fillRemainingRoundsWithRandomChoices(session);
    if (filled === 0) return;
    save(session);
    syncGameRounds(syncHandler);
}
</script>

<div class="page-block center-content">
    <RecordedGame bind:session {expState} />

    {#if !session.selectedAvatar}
        <FeedbackWrapper page="game_play" label="avatar selection" />
    {:else}
        <FeedbackWrapper page="game_play" label="game play" />
    {/if}
</div>

<NavigationBarWrapper {pageCompleted} />

{#if pageCompleted}
    <p>Saving...</p>
{/if}

{#if PUBLIC_ENV === "DEV"}
    <div class="dev-controls">
        {#if session.selectedAvatar && !pageCompleted}
            <button type="button" onclick={handleDevFillRemainingRounds}>
                Fill remaining rounds (random)
            </button>
        {/if}
        <button type="button" onclick={async () => {
            await requestNextPageCookie(expState);
            goto("survey");
        }}>Skip</button>
    </div>
{/if}
