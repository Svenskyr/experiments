<script lang="ts">
import { page } from "$app/state";
import NavigationBar from "#lib/exp/navigation/NavigationBar/v3/NavigationBar.svelte";
import { getExpState } from "#lib/exp/state/v1/ExperimentState.ts";
import {
    findAdjacentPermittedPages,
    pageNameFromRoute,
    pagePath,
} from "#lib/exp/state/v1/Pages.ts";
import { EXPERIMENT, PAGE_ORDER } from "#exp/dg-01/experiment.ts";

let { pageCompleted = true }: { pageCompleted?: boolean | undefined } = $props();

const expState = $derived(getExpState());
const currentPage = $derived(pageNameFromRoute(EXPERIMENT, page.url.pathname));
const { previousPage, nextPage, maxPage } = $derived(
    findAdjacentPermittedPages(EXPERIMENT, expState.pages, currentPage),
);
const codePreloadPath = $derived.by(() => {
    if (maxPage !== currentPage) return null;
    const pageToPreload = PAGE_ORDER[PAGE_ORDER.indexOf(maxPage) + 1];
    return pageToPreload ? pagePath(EXPERIMENT, pageToPreload) : null;
});
</script>

<NavigationBar
    {pageCompleted}
    {previousPage}
    {nextPage}
    {maxPage}
    {currentPage}
    {codePreloadPath}
/>
