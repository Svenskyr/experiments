<script lang="ts">
import { page } from "$app/state";
</script>

<div class="page-block center-content">
    <h1>An error has occurred</h1>
    <p>Error code {page.status ?? 500}: {page.error?.message ?? "Unknown error"}.</p>
</div>

<style>
p {
    text-align: center;
    max-width: 60%;
}
</style>
