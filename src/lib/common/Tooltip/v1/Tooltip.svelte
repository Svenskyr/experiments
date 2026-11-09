<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
    text: string;
    underline?: boolean;
    children: Snippet;
}

let { text, underline = false, children }: Props = $props();
</script>

<div class="tooltip-wrapper" class:has-underline={underline}>
    {@render children()}
    <span role="tooltip" id="tooltip-id">{@html text}</span>
</div>

<style>
.tooltip-wrapper {
    position: relative;
    display: inline-block;
}

/* When the underline prop is active */
.tooltip-wrapper.has-underline {
    text-decoration: underline dotted currentColor 1.5px;
    text-underline-offset: 4px;
    cursor: help;
}

[role="tooltip"] {
    /* Positioning */
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(4px) scale(0.95);
    transform-origin: top center;
    z-index: 50;
    white-space: nowrap;
    pointer-events: none;

    /* Visuals */
    background-color: #1e293b;
    color: #f8fafc;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.25rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);

    /* Animations */
    opacity: 0;
    visibility: hidden;
    transition:
        opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
        visibility 0.15s;
}

/* Arrow indicator */
[role="tooltip"]::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent #1e293b transparent;
}

/* Show hover states */
.tooltip-wrapper:hover [role="tooltip"],
.tooltip-wrapper:focus-within [role="tooltip"] {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(8px) scale(1);
}
</style>
