<script lang="ts">
let { data } = $props();
const { avatars } = $derived(data);

/* expState */
import { getExpState } from "#lib/exp/state/v1/ExperimentState.ts";
const expState = $derived(getExpState());

/* Page content */
import Avatar from "#lib/exp/avatars/v1/Avatar.svelte";

/* Page navigation */
import { requestNextPageCookie } from "#lib/exp/state/v1/Client.ts";
import NavigationBarWrapper from "#exp/dg-01/_components/NavigationBarWrapper.svelte";
import { EXPERIMENT } from "#exp/dg-01/experiment.ts";

// No instrument on this page: seeing it completes it.
const pageCompleted = true;
$effect(() => {
    if (pageCompleted) void requestNextPageCookie(EXPERIMENT, expState);
});
</script>

<div class="page-block center-content">
    <h1>Your avatar</h1>

    <Avatar name={avatars.self} alt="Your avatar" />

    <p>This avatar was assigned to you at random. It represents you in this study.</p>
</div>

<NavigationBarWrapper {pageCompleted} />
