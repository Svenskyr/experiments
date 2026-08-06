<script lang="ts">
import favicon from "$lib/assets/favicon.svg";
import { invalidate } from "$app/navigation";
import "./root.css";
import { Debugger, setDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.js";
const rootDebugger = new Debugger("root");
setDebugger(rootDebugger);
const thisDebugger = rootDebugger.extend("+layout.svelte");
const debug = thisDebugger.debug;
thisDebugger.enable();

let { data, children } = $props();
let { supabase, session: supabaseSession } = $derived(data);

$effect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, _session) => {
            debug(
                "Supabase auth state event received:",
                event,
                _session?.user?.email ? _session?.user?.email : _session?.user?.id,
            );

            if (_session?.access_token !== supabaseSession?.access_token) {
                invalidate("supabase:auth");
            }
        },
    );

    return () => subscription.unsubscribe();
});
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="main">
    {@render children()}
</div>
