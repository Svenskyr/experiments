<script lang="ts">
import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import ColorCoordinationGame from "$lib/exp/games/ccg/v3/game/ColorCoordinationGame.svelte";
import { newGameSession, shuffledAvatars } from "$lib/exp/games/ccg/v3/game/gameState.ts";
import { demoGameConfig } from "./GameConfig.ts";

let {
    expState,
    showPredictionControls,
}: {
    expState: ExperimentState;
    showPredictionControls: boolean;
} = $props();

const config = demoGameConfig({ showPredictionControls });
let session = $state(
    newGameSession(
        config,
        { selectedAvatar: shuffledAvatars[0] },
        expState.user.authUserId,
    ),
);
</script>

<ColorCoordinationGame bind:session />
