<script lang="ts">
import { dev } from "$app/environment";
import { PressedKeys } from "runed";
import { getDebugger } from "./Debugger.svelte.ts";
import DebugNode from "./DebuggerBranch.svelte";

const contextRootDebugger = getDebugger();
const thisDebugger = contextRootDebugger.extend("DebugMenu");
const debug = thisDebugger.debug;

if (dev) {
    contextRootDebugger.enable();
}

let showFeedbackDialog = $state(false);
let showToggle = $state(dev);
let dialogElement: HTMLDialogElement | undefined = $state(undefined);

const keys = new PressedKeys();
keys.onKeys(["d", "e", "b", "u", "g"], () => {
    showToggle = true;
    openDialog();
});

$effect(() => {
    if (showFeedbackDialog) openDialog();
});

function openDialog() {
    showFeedbackDialog = true;
    dialogElement?.showModal();
}

function closeDialog() {
    showFeedbackDialog = false;
    dialogElement?.close();
}

function handleMouseDown(event: MouseEvent) {
    if (dialogElement) {
        const rect = dialogElement.getBoundingClientRect();
        const outsideDialog = !(rect.top <= event.clientY
            && event.clientY <= rect.bottom
            && rect.left <= event.clientX
            && event.clientX <= rect.right);
        if (outsideDialog) closeDialog();
    }
}
</script>
    
    {#if showToggle}
        <button onclick={() => { if (showFeedbackDialog) closeDialog(); else openDialog(); }}
    class="debugger-tree-toggle">
    <span style="transform: scaleX(1)">🐛</span>
</button>
    {/if}
    
    {#if showFeedbackDialog}
        <dialog bind:this={dialogElement} onmousedown={handleMouseDown}
    class="debugger-tree-dialog">
    <h3>Debugger Tree</h3>
    <ul class="debugger-tree">
        <DebugNode node={contextRootDebugger} />
    </ul>
</dialog>
    {/if}
        
    <style>
.debugger-tree-toggle {
    position: fixed;
    bottom: 0;
    left: 0;
    border: none;
    background-color: transparent;
    cursor: pointer;
    z-index: 1;
    font-size: 1rem;
    &:hover:not(.disabled) {
        font-size: 1.1rem;
    }
}

.debugger-tree-dialog {
    display: flex;
    flex-direction: column;
    justify-self: center;
    align-self: center;
    gap: 1rem;
    align-items: center;
    border: none;
    border-radius: 1rem;
    width: 30em;
}

.debugger-tree {
    list-style: none;
    margin: 0;
    padding: 0;
    text-align: left;
}
</style>
