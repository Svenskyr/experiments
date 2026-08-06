<script lang="ts">
import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { load, save, sync as syncGameRounds } from "$exp/ccg-01/_database/CCGGameDBM.ts";
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
import ColorCoordinationGame from "$lib/exp/games/ccg/v3/game/ColorCoordinationGame.svelte";
import { type GameSession, mergeGameSession } from "$lib/exp/games/ccg/v3/game/gameState.ts";
import SelectAvatar from "$lib/exp/games/ccg/v2/avatars/SelectAvatar.svelte";
import type { Avatar } from "$lib/exp/games/ccg/v2/avatars/avatars.ts";
import { recordedShuffleSeed } from "./GameConfig.ts";

const syncHandler = getSyncHandler();

let {
    expState,
    session = $bindable<GameSession>(),
}: {
    expState: ExperimentState;
    session: GameSession;
} = $props();

const shuffleSeed = $derived(recordedShuffleSeed(expState));

function handleAvatarConfirm(avatar: Avatar) {
    mergeGameSession(session, { selectedAvatar: avatar }, shuffleSeed);
    save(session);
}
</script>

{#if !session.selectedAvatar}
    <SelectAvatar data={{ onConfirm: handleAvatarConfirm }} />
{:else}
    <ColorCoordinationGame
    bind:session
    save={save}
    sync={() => syncGameRounds(syncHandler)}
/>
{/if}
