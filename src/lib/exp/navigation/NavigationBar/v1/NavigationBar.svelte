<script lang="ts">
import debugLib from "debug";
const debug = debugLib("ccg-01:NavigationBar");
import { goto, preloadCode, preloadData } from "$app/navigation";
import { page } from "$app/state";
import { findAdjacentPages } from "../../../_state/Pages.ts";
import type { PageState } from "../../../_state/Pages.ts";

import { type Chevron } from "$lib/components/Shapes/Chevrons/v2/chevrons.ts";
import Chevrons from "$lib/components/Shapes/Chevrons/v2/Chevrons.svelte";

const chevronInnerAngle = 110;
const chevronLength = 2.5;
const chevronWidth = 1;
const chevronColor = "black";
const paddingTip = 0.75;
const paddingRear = 1;
const paddingPerp = 1;
const tipStyle = "sharp";
const previousChevrons: Chevron[] = $state([
    {
        orientation: -90,
        innerAngle: chevronInnerAngle,
        length: chevronLength,
        width: chevronWidth,
        color: chevronColor,
    },
]);
const nextChevrons: Chevron[] = $state([
    {
        orientation: 90,
        innerAngle: chevronInnerAngle,
        length: chevronLength,
        width: chevronWidth,
        color: chevronColor,
    },
]);

const maxChevrons: Chevron[] = $state([
    {
        orientation: 90,
        innerAngle: chevronInnerAngle,
        length: chevronLength,
        width: chevronWidth,
        color: chevronColor,
    },
    {
        orientation: 90,
        innerAngle: chevronInnerAngle,
        length: chevronLength,
        width: chevronWidth,
        color: chevronColor,
    },
    {
        orientation: 90,
        innerAngle: chevronInnerAngle,
        length: chevronLength,
        width: chevronWidth,
        color: chevronColor,
    },
]);

let { data } = $props();
const { expState } = $derived(data);
const { maxPage, nextPage, previousPage } = $derived(
    findAdjacentPages(expState.pages, page.url.pathname),
);

const currentPage = $derived(page.url.pathname.split("/").pop() ?? "");
const pageToPreloadCode: string | null = $derived.by(() => {
    if (onMaxPage) {
        // return the next index (it won't be permitted, but we can still preload the code)
        const nextIndex = expState.pages.findIndex((p: PageState) => p.name === maxPage) + 1;
        return nextIndex < expState.pages.length ? expState.pages[nextIndex].name : null;
    }
    return null;
});

const canGoBack = $derived(previousPage !== "");
const canGoForward = $derived(nextPage !== "");
const onMaxPage = $derived(maxPage === currentPage);

function handleClick(page: string) {
    switch (page) {
        case "previous":
            if (canGoBack) goto(previousPage);
            break;
        case "next":
            if (canGoForward) goto(nextPage);
            break;
        case "max":
            if (!onMaxPage) goto(maxPage);
            break;
    }
}

$effect(() => {
    if (nextPage) {
        preloadData(nextPage);
    }
    if (pageToPreloadCode) {
        preloadCode(`/experiments/ccg-01/${pageToPreloadCode}`);
    }
});
</script>

<div class="nav-bar-bottom">
    <button
        class="nav-button back exp-default-button"
        onclick={() => handleClick("previous")}
        class:disabled={!canGoBack}
    >
        <Chevrons
            root
            chevrons={previousChevrons}
            class="back-chevron"
            {paddingTip}
            {paddingRear}
            {paddingPerp}
            {tipStyle}
        />
    </button>
    <button
        class="nav-button next exp-default-button"
        onclick={() => handleClick("next")}
        class:disabled={!canGoForward}
    >
        <Chevrons
            root
            chevrons={nextChevrons}
            class="next-chevron"
            {paddingTip}
            {paddingRear}
            {paddingPerp}
            {tipStyle}
        />
    </button>
    <button class="nav-button max exp-default-button" onclick={() => handleClick("max")}
        class:disabled={onMaxPage}>
        <Chevrons
            root
            chevrons={maxChevrons}
            spacing={-1.5}
            class="max-chevrons"
            {paddingTip}
            {paddingRear}
            {paddingPerp}
            {tipStyle}
        />
    </button>
</div>

<style>
.nav-bar-bottom {
    display: flex;
    gap: 0.5rem;
}

.nav-button {
    display: flex;
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
    }
}
.nav-button :global(svg) {
    display: block;
    height: 100%;
    width: auto;
}
</style>
