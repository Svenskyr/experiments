<script lang="ts">
import { dev } from "$app/env";
import { onMount } from "svelte";
import { clearExperimentLocalStorage } from "#exp/dg-01/_database/ResponseDraft.ts";

// DRAFT: drafts are discarded here. Once responses sync, clear only after the queue is empty
// (see ccg-01 end page: finalizeClientSession).
onMount(clearExperimentLocalStorage);
</script>

<div class="page-block center-content">
    <h1>Study complete</h1>

    <p>Thank you for participating.</p>

    <!-- TODO: payment summary and the link that returns the participant to the platform. -->
</div>

{#if dev}
    <form method="POST" action="?/restart">
        <button type="submit">Restart as a new participant</button>
    </form>
{/if}
