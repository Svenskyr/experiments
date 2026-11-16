<script lang="ts">
/* expState */
import { getExpState } from "#lib/exp/state/v1/ExperimentState.ts";
const expState = $derived(getExpState());

/* Page navigation */
import { goto } from "$app/navigation";
import { requestNextPageCookie } from "#lib/exp/state/v1/Client.ts";
import { maxPage, pagePath } from "#lib/exp/state/v1/Pages.ts";
import { EXPERIMENT } from "#exp/dg-01/experiment.ts";

async function handleAgree() {
    await requestNextPageCookie(EXPERIMENT, expState);
    await goto(pagePath(EXPERIMENT, maxPage(EXPERIMENT, expState.pages)));
}
</script>

<div class="page-block">
    <h1>Consent</h1>

    <!-- TODO: consent copy (investigators, IRB reference, time, payment, data use). -->
    <p>[Consent form placeholder]</p>

    <p class="center">
        <strong>
            By continuing, you confirm that you have read the information above and that you agree
            to participate in this study.
        </strong>
    </p>

    <button type="button" class="exp-default-button center" onclick={handleAgree}>I agree</button>
</div>
