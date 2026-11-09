<script lang="ts">
import debugLib from "debug";
const debug = debugLib("::color-scheme");
import { onMount } from "svelte";
import { PressedKeys } from "runed";

let colorScheme = $state(determineColorScheme() || "light");

function determineColorScheme(): string | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    const savedColorScheme = localStorage.getItem("color-scheme");
    if (savedColorScheme) {
        return savedColorScheme;
    } else {
        const preferredScheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        colorScheme = preferredScheme;
        localStorage.setItem("color-scheme", colorScheme);
        return colorScheme;
    }
}

function applyColorScheme(newColorScheme: string) {
    colorScheme = newColorScheme;
    document.documentElement.style.colorScheme = newColorScheme;
    document.documentElement.setAttribute(
        "data-color-scheme",
        newColorScheme,
    );
    localStorage.setItem("color-scheme", newColorScheme);
    debug("Applied color scheme:", newColorScheme);
}

function toggleColorScheme() {
    const newScheme = colorScheme === "light" ? "dark" : "light";
    applyColorScheme(newScheme);
}

const keys = new PressedKeys();
keys.onKeys(["d", "a", "r", "k"], () => {
    toggleColorScheme();
});
keys.onKeys(["l", "i", "g", "h", "t"], () => {
    toggleColorScheme();
});
</script>

<button class={colorScheme} onclick={() => toggleColorScheme()}>
    {colorScheme === "light" ? "☀️" : "🌙"}
    <!-- 🌓 -->
</button>

<style>
button {
    position: fixed;
    top: 1rem;
    right: 1rem;
    /* padding: 0.5rem; */
    background: none;
    border: none;
    border-radius: 0.25rem;
    font-size: 1rem;
    cursor: pointer;
    /* background-color: light-dark(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0)); */
    z-index: 1001;
}
</style>
