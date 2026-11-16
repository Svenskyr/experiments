<script lang="ts">
import { onMount, untrack } from "svelte";

let { data } = $props();
const { game, avatars } = $derived(data);

/* expState */
import { getExpState } from "#lib/exp/state/v1/ExperimentState.ts";
const expState = $derived(getExpState());

/* Page game */
import Avatar from "#lib/exp/avatars/v1/Avatar.svelte";
import DictatorGame from "#lib/exp/games/dictator/v1/DictatorGame.svelte";
import { type DictatorGameResponse, model } from "#lib/exp/games/dictator/v1/DictatorGame.ts";
import { loadDraft, saveDraft } from "#exp/dg-01/_database/ResponseDraft.ts";

let response = $state<DictatorGameResponse>(model.emptyResponse(untrack(() => data.game.public)));

// localStorage exists only in the browser, so the draft is read after hydration.
onMount(() => {
    const draft = loadDraft(game.id, (raw) => model.parseResponse(game.public, raw));
    if (draft) response = draft;
});

function handleCommit() {
    saveDraft(game.id, response);
    // TODO: enqueue game.id on the SyncHandler once the commit endpoint exists.
}

/* Page navigation */
import { goto } from "$app/navigation";
import { requestNextPageCookie } from "#lib/exp/state/v1/Client.ts";
import { maxPage, pagePath } from "#lib/exp/state/v1/Pages.ts";
import NavigationBarWrapper from "#exp/dg-01/_components/NavigationBarWrapper.svelte";
import { EXPERIMENT } from "#exp/dg-01/experiment.ts";

const pageCompleted = $derived(model.status(game.public, response) === "complete");

async function completePage() {
    await requestNextPageCookie(EXPERIMENT, expState);
    await goto(pagePath(EXPERIMENT, maxPage(EXPERIMENT, expState.pages)), { replace: true });
}

$effect(() => {
    // Untracked: completePage reads and then writes expState.
    if (pageCompleted) untrack(() => void completePage());
});
</script>

<div class="page-block center-content">
    <h1>Your decision</h1>

    <div class="players">
        <figure class="player">
            <Avatar name={avatars.self} alt="Your avatar" size="small" />
            <figcaption>You</figcaption>
        </figure>
        <figure class="player">
            <Avatar name={avatars.other} alt="The other player's avatar" size="small" />
            <figcaption>Other player</figcaption>
        </figure>
    </div>

    <DictatorGame id={game.id} config={game.public} bind:response oncommit={handleCommit} />
</div>

<NavigationBarWrapper {pageCompleted} />

<style>
.players {
    display: flex;
    justify-content: center;
    gap: 4rem;
}

.player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
}
</style>
