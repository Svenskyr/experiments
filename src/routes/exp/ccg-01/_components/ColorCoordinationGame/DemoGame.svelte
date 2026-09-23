<script lang="ts">
import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import ColorCoordinationGame from "$lib/exp/games/ccg/v3/game/ColorCoordinationGame.svelte";
import {
    type GameSession,
    newGameSession,
    shuffledAvatars,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";
import { onMount } from "svelte";
import { demoGameConfig, recordedShuffleSeed } from "./GameConfig.ts";

let {
    expState,
    showPredictionControls,
}: {
    expState: ExperimentState;
    showPredictionControls: boolean;
} = $props();

let session = $state<GameSession | null>(null);

onMount(() => {
    session = newGameSession(
        demoGameConfig({ showPredictionControls }),
        { selectedAvatar: shuffledAvatars[0] },
        recordedShuffleSeed(expState),
    );
});
</script>

{#if session}
    <ColorCoordinationGame bind:session />
{/if}
