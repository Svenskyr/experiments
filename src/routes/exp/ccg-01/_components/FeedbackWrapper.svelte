<script lang="ts">
/** syncHandler */
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
const syncHandler = getSyncHandler();

/** feedback */
import {
    type FeedbackData,
    mergeFeedbackData,
    newFeedbackData,
} from "$lib/common/Feedback/v4/Feedback.ts";
import Feedback from "$lib/common/Feedback/v4/Feedback.svelte";
import { load, save, sync } from "$exp/ccg-01/_database/FeedbackDBM.ts";

let { page, label }: { page: string; label: string } = $props();
// svelte-ignore state_referenced_locally
let feedbackData: FeedbackData = $state(newFeedbackData(page, label));
// svelte-ignore state_referenced_locally
const storedData = load(page, label);
if (storedData) {
    // svelte-ignore state_referenced_locally
    feedbackData = mergeFeedbackData(feedbackData, storedData);
}
</script>

<Feedback
    bind:data={feedbackData}
    save={save}
    sync={(data) => sync(syncHandler, data)}
/>
