<script lang="ts">
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+end").debug;
import { goto } from "$app/navigation";
import NavigationBarWrapper from "$exp/ccg-01/_components/NavigationBarWrapper.svelte";
let { data } = $props();

import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

const returnToProlificUrl = "/"; // Not implemented yet
let redirectTimeoutSeconds = $state(5);

let pageCompleted = $derived(true);

$effect(() => {
    if (redirectTimeoutSeconds > 0) {
        const redirectTimeout = setTimeout(() => {
            redirectTimeoutSeconds--;
            return () => clearTimeout(redirectTimeout);
        }, 1000);
    }
});

$effect(() => {
    if (redirectTimeoutSeconds <= 0) {
        if (returnToProlificUrl) {
            window.location.href = returnToProlificUrl;
        } else {
            goto("/");
        }
    }
});
</script>

<div class="page-block">
    <h1>Thank you for your participation!</h1>

    <h2>Automatically redirecting in {redirectTimeoutSeconds} seconds...</h2>
    {#if !returnToProlificUrl}
        <a href="/" onclick={() => goto("/")}>Home</a>
    {/if}
</div>

<NavigationBarWrapper {pageCompleted} />
