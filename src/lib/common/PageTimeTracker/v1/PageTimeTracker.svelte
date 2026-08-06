<script lang="ts">
import debugLib from "debug";
const debug = debugLib("ccg-01:PageTimeTracker");
import { page } from "$app/state";
import { beforeNavigate } from "$app/navigation";
import { pageNameFromRoute } from "../../_state/Pages.ts";
import type { PageTimeRecord } from "./PageTimeTracker.ts";
import { flushActivePage, loadPageTimeRecord, newPageTimeRecord } from "./PageTimeTracker.ts";
import { onMount, untrack } from "svelte";

// sync() -> sync the page time record to the server
let { key, sync }: { key: string; sync?: (record: Record<string, number>) => void } = $props();
let record: PageTimeRecord = $state(newPageTimeRecord());

onMount(() => {
    record = loadPageTimeRecord(key);
});

$effect(() => {
    const currentPageName = pageNameFromRoute(page.url.pathname);
    untrack(() => {
        record = flushActivePage(key, record, currentPageName);
        sync?.(record.timesMs);
    });
});
</script>
