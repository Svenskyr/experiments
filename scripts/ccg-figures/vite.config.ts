import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// #lib and #exp resolve through the "imports" field of the repo's package.json.
export default defineConfig({
    root: import.meta.dirname,
    plugins: [svelte()],
    server: {
        host: "127.0.0.1",
        port: 4179,
        strictPort: true,
    },
});
