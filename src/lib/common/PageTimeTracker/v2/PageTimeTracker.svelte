<script lang="ts">
import { page } from "$app/state";
import { pageNameFromRoute } from "$lib/common/PageFunctions/PageFunctions.ts";
import { flushActivePage, PageTimeRecord } from "./PageTimeTracker.ts";
import { afterNavigate, beforeNavigate } from "$app/navigation";

let {
    key,
    record = $bindable(),
    save,
    sync,
}: {
    key: string;
    record: PageTimeRecord;
    save?: (record: PageTimeRecord) => void;
    sync?: (record: PageTimeRecord) => void;
} = $props();

beforeNavigate((navigation) => {
    const targetPageName = pageNameFromRoute(navigation?.to?.route?.id ?? "");
    record = flushActivePage(key, record, targetPageName);
    save?.(record);
    sync?.(record);
});

afterNavigate(() => {
    const currentPageName = pageNameFromRoute(page.url.pathname);
    record = flushActivePage(key, record, currentPageName);
    save?.(record);
});
</script>
