<script lang="ts">
import { dev } from "$app/environment";
import * as base from "$lib/common/Debugger/v1/Debug.svelte.ts";
import DebugTreeNode from "$lib/common/Debugger/v1/DebugTreeNode.svelte";
const debug = base.newDebugger("lib:common:Debugger:v1:Debug");

const availableNamespaces = $derived(Array.from(base.registry).sort());

let currentFilter = $state(
    typeof window !== "undefined" ? localStorage.getItem("debug") || "" : "",
);
function toggle(namespace: string) {
    let filters = currentFilter.split(",").filter((f) => f.length > 0);
    if (filters.includes(namespace)) {
        filters = filters.filter((f) => f !== namespace);
    } else {
        filters.push(namespace);
    }
    base.setDebugFilters(filters);
}

let activeFilters = $state(
    (typeof window !== "undefined" ? localStorage.getItem("debug") || "" : "")
        .split(",")
        .filter(Boolean),
);

function handleToggle(ns: string) {
    ns = ns + ":*";
    debug(`Toggling namespace: ${ns}`);
    if (activeFilters.includes(ns)) {
        activeFilters = activeFilters.filter((f) => f !== ns);
    } else {
        activeFilters.push(ns);
    }
    base.setDebugFilters(activeFilters);
}

let showDashboard = $state(false);

import { PressedKeys } from "runed";
const keys = new PressedKeys();
keys.onKeys(["d", "e", "b", "u", "g"], () => {
    showDashboard = !showDashboard;
});

function toggleAll() {
    if (activeFilters.length === base.registry.size) {
        activeFilters = [];
    } else {
        activeFilters = Array.from(base.registry.keys());
    }
    base.setDebugFilters(activeFilters);
}
</script>


{#if showDashboard}
<div class="dashboard">
    <strong>Debug Namespaces</strong>
    <button onclick={() => showDashboard = false}>X</button>
    <DebugTreeNode
        node={base.getNamespaceTree()}
        {activeFilters}
        onToggle={handleToggle}
    />
    <button onclick={() => toggleAll()}>Toggle All</button>
</div>

{/if}

<style>
.dashboard {
    position: fixed;
    bottom: 0;
    left: 0;
    background: #111;
    color: #eee;
    padding: 10px;
    max-height: 50vh;
    overflow-y: auto;
    z-index: 1000;
    border-top-right-radius: 8px;
    border: 1px solid #333;
}
</style>
