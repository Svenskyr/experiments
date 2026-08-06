<script lang="ts">
import type { DebugNode } from "./Debug.svelte.ts";
import Self from "./DebugTreeNode.svelte";
let { node, activeFilters, onToggle }: {
    node: DebugNode;
    activeFilters: string[];
    onToggle: (ns: string) => void;
} = $props();

const isChecked = $derived(activeFilters.includes(node.fullName));
const hasChildren = $derived(node.children.size > 0);
</script>

<div class="node">
    {#if node.fullName}
    <label>
        <input type="checkbox" checked={isChecked} onchange={() => onToggle(node.fullName)}>
        {node.name}
    </label>
    {/if}
    {#if hasChildren}
    <div class="children">
        {#each Array.from(node.children.values()) as child}
            <Self node={child} {activeFilters} {onToggle}/>
        {/each}
    </div>
    {/if}
</div>

<style>
.node {
    margin-left: 12px;
    font-family: monospace;
}
.children {
    border-left: 1px solid #444;
}
label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    white-space: nowrap;
}
</style>
