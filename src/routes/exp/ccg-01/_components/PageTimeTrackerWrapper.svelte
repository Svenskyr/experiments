<script lang="ts">
/** pageTimeRecord */
import PageTimeTracker from "$lib/common/PageTimeTracker/v2/PageTimeTracker.svelte";
import { PageTimeRecord } from "$lib/common/PageTimeTracker/v2/PageTimeTracker.ts";

/** syncHandler */
import { load, save, sync } from "$exp/ccg-01/_database/PageTimeTrackerDBM.ts";
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
const syncHandler = getSyncHandler();
const pageTimeRecord = load() ?? PageTimeRecord();
</script>

<PageTimeTracker
    key="page-time-record"
    record={pageTimeRecord}
    save={save}
    sync={() => sync(syncHandler)}
/>
