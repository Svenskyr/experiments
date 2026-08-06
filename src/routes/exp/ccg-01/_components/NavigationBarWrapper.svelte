<script lang="ts">
import { dev } from "$app/environment";
import NavigationBar from "$lib/exp/navigation/NavigationBar/v3/NavigationBar.svelte";
import { page } from "$app/state";
import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
import {
    findAdjacentPermittedPages,
    PAGE_ORDER,
    pageNameFromRoute,
} from "$exp/ccg-01/_state/Pages.ts";

let { pageCompleted = true } = $props();

const expState = $derived(getExpState());
const { previousPage, nextPage, maxPage } = $derived(
    findAdjacentPermittedPages(expState.pages, pageNameFromRoute(page.url.pathname)),
);
const currentPage = $derived(pageNameFromRoute(page.url.pathname));
const codePreloadPath = $derived.by(() => {
    if (maxPage === currentPage) {
        const nextIndex = PAGE_ORDER.indexOf(maxPage) + 1;
        const pageToPreload = nextIndex < PAGE_ORDER.length ? PAGE_ORDER[nextIndex] : null;
        return pageToPreload ? `/exp/ccg-01/${pageToPreload}` : null;
    }
    return null;
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


{#if dev}
<details>
    <summary>Nav debug</summary>
    Current page: {currentPage}<br>
    Previous page: {previousPage}<br>
    Next page: {nextPage}<br>
    Max page: {maxPage}<br>
    Code preload path: {codePreloadPath}<br>
    Page completed: {pageCompleted}<br>
</details>
{/if}
