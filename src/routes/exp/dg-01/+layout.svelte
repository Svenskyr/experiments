<script lang="ts">
import { dev } from "$app/env";
import ColorScheme from "#lib/common/ColorScheme/v1/ColorScheme.svelte";
import DebuggerTree from "#lib/common/Debugger/v2/DebuggerTree.svelte";
import "#exp/dg-01/experiment.css";

let { data, children } = $props();

/* Debugger */
import { Debugger, setDebugger } from "#lib/common/Debugger/v2/Debugger.svelte.ts";
import { EXPERIMENT_ID } from "#exp/dg-01/experiment.ts";
setDebugger(new Debugger(EXPERIMENT_ID));

/* expState */
import { untrack } from "svelte";
import { setExpState } from "#lib/exp/state/v1/ExperimentState.ts";
// Initial value only; the effect below merges every later server result.
let expState = $state(untrack(() => data.expState));
setExpState(expState);

$effect(() => {
    Object.assign(expState, data.expState);
});

// DRAFT: no SyncHandler and no PageTimeTracker yet.
</script>

<ColorScheme />
<DebuggerTree />
<div class="experiment-container">
    {@render children()}
</div>

{#if dev}
    <pre class="debug-info">{JSON.stringify(expState, null, 2)}</pre>
{/if}

<style>
.debug-info {
    margin-inline: auto;
    width: min(50rem, 100%);
}
</style>
