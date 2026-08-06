<script lang="ts">
import { dev } from "$app/environment";
import ColorScheme from "$lib/common/ColorScheme/ColorScheme.svelte";
import DebuggerTree from "$lib/common/Debugger/v2/DebuggerTree.svelte";
import "$exp/ccg-01/experiment.css";

import { Debugger, setDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const expDebugger = new Debugger("exp_ccg_01");
setDebugger(expDebugger);
const debug = expDebugger.extend("+layout.svelte").debug;

let { data, children } = $props();
const { supabase } = $derived(data);

/** expState */
import { setExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $state(data.expState);
setExpState(expState);

$effect(() => {
    const serverExpState = data.expState;
    Object.assign(expState, serverExpState);
});

/** syncHandler */
import { setSyncHandler, SyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
const syncHandler = new SyncHandler("exp_ccg_01", expDebugger.extend("SyncHandler").debug);
setSyncHandler(syncHandler);

$effect(() => {
    if (supabase && expState.session.sessionId && !syncHandler.ready) {
        void syncHandler.initDb(supabase, expState.session.sessionId);
    }
});

/** pageTimeTracker */
import PageTimeTrackerWrapper from "$exp/ccg-01/_components/PageTimeTrackerWrapper.svelte";
</script>

<ColorScheme />
<PageTimeTrackerWrapper />
<DebuggerTree />
<div class="experiment-container">
    {@render children()}
</div>



{#if dev}
    <div class="debug-info center">
    <pre>{JSON.stringify(expState, null, 2)}</pre>
</div>
{/if}

<style>
.debug-info {
    width: min(50rem, 100%);
}
</style>
