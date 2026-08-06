<script lang="ts">
import { goto, preloadCode, preloadData } from "$app/navigation";

import previousSvg from "./NavigationChevrons/previous.svg?raw";
import nextSvg from "./NavigationChevrons/next.svg?raw";
import maxSvg from "./NavigationChevrons/max.svg?raw";

let {
    pageCompleted = true,
    previousPage,
    nextPage,
    maxPage,
    currentPage,
    codePreloadPath = null,
}: {
    pageCompleted?: boolean;
    previousPage: string;
    nextPage: string;
    maxPage: string;
    currentPage: string;
    codePreloadPath?: string | null;
} = $props();

const canGoBack = $derived(previousPage !== "");
const canGoForward = $derived(nextPage !== "" && pageCompleted);
const onMaxPage = $derived(maxPage === currentPage);
const nextPageIsMaxPage = $derived(nextPage === maxPage);

function handleClick(page: string) {
    switch (page) {
        case "previous":
            if (canGoBack) goto(previousPage);
            break;
        case "next":
            if (canGoForward) goto(nextPage);
            break;
        case "max":
            if (canGoForward) goto(maxPage);
            break;
    }
}

$effect(() => {
    if (nextPage) {
        preloadData(nextPage);
    }
    if (codePreloadPath) {
        preloadCode(codePreloadPath);
    }
});
</script>

<div class="nav-bar-bottom">
    <button
        class="nav-button back exp-default-button"
        onclick={() => handleClick("previous")}
        class:disabled={!canGoBack}
    >
        {@html previousSvg}
    </button>
    <button
        class="nav-button next exp-default-button"
        onclick={() => handleClick("next")}
        class:disabled={!canGoForward}
    >
        {@html nextSvg}
    </button>
    {#if canGoForward && !nextPageIsMaxPage}
    <button class="nav-button max exp-default-button" onclick={() => handleClick("max")}
        class:disabled={!canGoForward || onMaxPage}>
        {@html maxSvg}
    </button>
    {/if}


</div>

<style>
.nav-bar-bottom {
    display: flex;
    gap: 0.5rem;
}

.nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    width: auto;
    height: 2rem;
    cursor: default;
    padding: 0.1rem;
    background-color: light-dark(oklch(95% 0 0), oklch(90% 0 0));
    border: 1px solid light-dark(oklch(50% 0 0), oklch(0% 0 0));
    &.back {
        margin-right: auto;
    }
    &.disabled {
        background-color: light-dark(oklch(90% 0 0), oklch(80% 0 0));
        pointer-events: none;
    }
}
.nav-button :global(svg) {
    display: block;
    flex: 0 0 auto;
    max-height: 100%;
    height: 100%;
    width: auto;
}
</style>
