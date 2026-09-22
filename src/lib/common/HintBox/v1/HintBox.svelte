<script lang="ts">
import type { Snippet } from "svelte";
import { tick } from "svelte";

interface Props {
    content?: string;
    body?: Snippet;
    label?: string;
}

let { content = "", body, label = "More information" }: Props = $props();

const panelId = $props.id();

let hovering = $state(false);
let pinned = $state(false);
let toggleElement: HTMLButtonElement | undefined = $state(undefined);
let panelElement: HTMLDivElement | undefined = $state(undefined);

const visible = $derived(hovering || pinned);

function syncLandscapeMinWidth() {
    if (!panelElement) return;

    const { offsetWidth, offsetHeight } = panelElement;
    if (offsetWidth >= offsetHeight) return;

    const maxWidth = parseFloat(getComputedStyle(panelElement).maxWidth);
    const needed = Math.min(offsetHeight, maxWidth);
    const currentMin = parseFloat(panelElement.style.minWidth) || 0;
    if (needed > currentMin) {
        panelElement.style.minWidth = `${needed}px`;
    }
}

$effect(() => {
    if (!visible) return;

    content;
    body;
    panelElement;

    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;

    if (panelElement) panelElement.style.minWidth = "";

    void tick().then(() => {
        if (disposed || !panelElement) return;

        syncLandscapeMinWidth();
        resizeObserver = new ResizeObserver(() => {
            if (!disposed) syncLandscapeMinWidth();
        });
        resizeObserver.observe(panelElement);
    });

    return () => {
        disposed = true;
        resizeObserver?.disconnect();
        if (panelElement) panelElement.style.minWidth = "";
    };
});

function isInsideRect(rect: DOMRect, x: number, y: number): boolean {
    return rect.top <= y && y <= rect.bottom && rect.left <= x && x <= rect.right;
}

function handleDocumentMouseDown(event: MouseEvent) {
    if (!pinned) return;

    const { clientX: x, clientY: y } = event;
    const insideToggle = toggleElement
        && isInsideRect(toggleElement.getBoundingClientRect(), x, y);
    const insidePanel = panelElement
        && isInsideRect(panelElement.getBoundingClientRect(), x, y);

    if (!insideToggle && !insidePanel) {
        pinned = false;
    }
}

function handleDocumentKeyDown(event: KeyboardEvent) {
    if (pinned && event.key === "Escape") {
        pinned = false;
        event.preventDefault();
    }
}

$effect(() => {
    if (!pinned) return;

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
        document.removeEventListener("mousedown", handleDocumentMouseDown);
        document.removeEventListener("keydown", handleDocumentKeyDown);
    };
});

function handleToggleClick() {
    pinned = !pinned;
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="hint-box"
    onmouseenter={() => (hovering = true)}
    onmouseleave={() => (hovering = false)}
>
    <button
        type="button"
        class="hint-toggle"
        class:pinned
        bind:this={toggleElement}
        aria-expanded={visible}
        aria-pressed={pinned}
        aria-controls={visible ? panelId : undefined}
        aria-label={label}
        onclick={handleToggleClick}
    >
        ?
    </button>
    {#if visible}
        <div
            bind:this={panelElement}
            id={panelId}
            class="hint-panel"
            role="note"
        >
            {#if body}
                {@render body()}
            {:else}
                {content}
            {/if}
        </div>
    {/if}
</div>

<style>
.hint-box {
    position: absolute;
    top: 0;
    left: 100%;
    margin-left: 0.25rem;
    z-index: 1;
}

.hint-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: 1px solid light-dark(oklch(60% 0 0), oklch(50% 0 0));
    border-radius: 50%;
    background-color: light-dark(oklch(100% 0 0), oklch(30% 0 0));
    color: light-dark(oklch(40% 0 0), oklch(85% 0 0));
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    cursor: help;
    &:hover {
        border-color: light-dark(oklch(40% 0 0), oklch(70% 0 0));
        font-size: 0.8rem;
    }
    &.pinned {
        background-color: light-dark(oklch(40% 0 0), oklch(85% 0 0));
        color: light-dark(oklch(100% 0 0), oklch(30% 0 0));
        border-color: light-dark(oklch(40% 0 0), oklch(70% 0 0));
    }
}

.hint-panel {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    box-sizing: border-box;
    width: fit-content;
    min-width: 6rem;
    max-width: 22rem;
    padding: 0.625rem 0.75rem;
    overflow-wrap: break-word;
    border: 1px solid light-dark(oklch(80% 0 0), oklch(35% 0 0));
    border-radius: 0.5rem;
    background-color: light-dark(oklch(100% 0 0), oklch(22% 0 0));
    color: light-dark(oklch(25% 0 0), oklch(90% 0 0));
    font-size: 0.875rem;
    line-height: 1.4;
    box-shadow:
        0 4px 6px -1px light-dark(oklch(0% 0 0 / 0.1), oklch(0% 0 0 / 0.4)),
        0 2px 4px -2px light-dark(oklch(0% 0 0 / 0.1), oklch(0% 0 0 / 0.3));
}

:global(:has(> .hint-box)) {
    position: relative;
}
</style>
