<script lang="ts">
/* expState */
import { getExpState } from "#lib/exp/state/v1/ExperimentState.ts";
const expState = $derived(getExpState());

/* Page content */
import { ENDOWMENT } from "#exp/dg-01/_components/DictatorGame/GameConfig.ts";

/* Page navigation */
import { requestNextPageCookie } from "#lib/exp/state/v1/Client.ts";
import NavigationBarWrapper from "#exp/dg-01/_components/NavigationBarWrapper.svelte";
import { EXPERIMENT } from "#exp/dg-01/experiment.ts";

// DRAFT: no comprehension questions yet, so seeing the page completes it.
const pageCompleted = true;
$effect(() => {
    if (pageCompleted) void requestNextPageCookie(EXPERIMENT, expState);
});
</script>

<div class="page-block">
    <h1>Instructions</h1>

    <!-- TODO: these rules are placeholders. Set the matching rule, what the other player's
    avatar tells the participant, whether the other player sees the participant's avatar, and
    the rate that converts points to payment; then state each here. -->
    <ul>
        <li>You have {ENDOWMENT} points.</li>
        <li>One other participant in this study is the <em>other player</em>.</li>
        <li>An avatar represents the other player.</li>
        <li>You decide how many of your {ENDOWMENT} points to give to the other player.</li>
        <li>You keep the points that you do not give.</li>
        <li>The other player makes no decision.</li>
        <li>You decide once. After you confirm your decision, you cannot change it.</li>
    </ul>
</div>

<NavigationBarWrapper {pageCompleted} />
