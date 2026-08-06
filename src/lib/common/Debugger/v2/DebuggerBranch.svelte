<script lang="ts">
import type { Debugger } from "./Debugger.svelte.ts";
import Self from "./DebuggerBranch.svelte";

let { node }: { node: Debugger } = $props();

const label = $derived(node.name.split(":").at(-1) ?? node.name);
const children = $derived([...node.children.values()]);
</script>

<li>
    <label>
        <input
            type="checkbox"
            checked={node.enabled}
            onchange={() => node.toggle()}
        />
        {label}
    </label>

    {#if children.length}
        <ul>
            {#each children as child (child.name)}
                <Self node={child} />
            {/each}
        </ul>
    {/if}
</li>

<style>
ul {
    list-style: none;
    margin: 0.25rem 0 0;
    padding-left: 1.25rem;
}

label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
}
</style>
