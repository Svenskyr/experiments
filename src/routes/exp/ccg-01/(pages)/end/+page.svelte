<script lang="ts">
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+end").debug;
import NavigationBarWrapper from "$exp/ccg-01/_components/NavigationBarWrapper.svelte";
import {
    clearExperimentLocalStorage,
    finalizeClientSession,
} from "$exp/ccg-01/_state/clearClientSession.ts";
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";

import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

let { data } = $props();
const { supabase } = $derived(data);
const syncHandler = getSyncHandler();
const FINALIZE_POLL_INTERVAL_MS = 2000;
const FINALIZE_MAX_ATTEMPTS = 15;

let finishingUp = $state(true);
let redirectTimeoutSeconds = $state(5);

let pageCompleted = $derived(true);

const returnTo: string = $derived.by(() => {
    switch (expState.user.platform) {
        case "prolific":
            return "https://app.prolific.com/submissions/complete?cc=C1QXQMAD";
        default:
            return "/";
    }
});

$effect(() => {
    if (!browser) return;

    let cancelled = false;

    (async () => {
        for (let attempt = 0; attempt < FINALIZE_MAX_ATTEMPTS && !cancelled; attempt++) {
            const result = await finalizeClientSession();
            if (result.ok) {
                clearExperimentLocalStorage();
                syncHandler.resetSession();
                const { error: signOutError } = await supabase.auth.signOut();
                if (signOutError) {
                    debug("Supabase signOut failed", signOutError);
                }
                finishingUp = false;
                return;
            }
            if (attempt < FINALIZE_MAX_ATTEMPTS - 1) {
                await new Promise((resolve) => setTimeout(resolve, FINALIZE_POLL_INTERVAL_MS));
            }
        }
        debug("Finalize timed out; continuing to redirect");
        finishingUp = false;
    })();

    return () => {
        cancelled = true;
    };
});

$effect(() => {
    if (finishingUp) return;
    if (redirectTimeoutSeconds <= 0) {
        window.location.href = returnTo;
        return;
    }
    const redirectTimeout = setTimeout(() => {
        redirectTimeoutSeconds--;
    }, 1000);
    return () => clearTimeout(redirectTimeout);
});
</script>

<div class="page-block center-content">
    <h1>Thank you for your participation!</h1>

    {#if finishingUp}
        <h2>Finishing up…</h2>
    {:else}
        <h2>Automatically redirecting in {redirectTimeoutSeconds} seconds...</h2>
        <a href={returnTo} onclick={() => window.location.href = returnTo}>Click here if the page does not redirect automatically.</a>
    {/if}
</div>

<NavigationBarWrapper {pageCompleted} />
