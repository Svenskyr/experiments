<script lang="ts">
import debugLib from "debug";
const debug = debugLib("(site):layout.svelte");
import "./site.css";
import ColorScheme from "$lib/common/ColorScheme/ColorScheme.svelte";

let { data, children } = $props();
</script>

<div class="top-nav-bar">
    <a href="/">Home</a>
    <a href="/login">Login</a>
    <a href="experiments">Experiments</a>
    <a href="surveys">Surveys</a>
</div>

<ColorScheme />

<div class="content">
    {@render children()}
</div>

<style>
.top-nav-bar {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--root-bg-0);
    position: sticky;
    top: 0;
    z-index: 1000;
}

.content {
    display: flex;
    flex-direction: column;
    /* gap: 1rem; */
    /* padding: 1rem; */
    align-items: center;
    justify-self: center;
    max-width: 1200px;
}
</style>
