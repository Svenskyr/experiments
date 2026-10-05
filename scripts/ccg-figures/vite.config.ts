import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import { defineConfig } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
    root: import.meta.dirname,
    plugins: [svelte()],
    resolve: {
        alias: {
            $lib: path.resolve(repoRoot, "src/lib"),
            $exp: path.resolve(repoRoot, "src/routes/exp"),
        },
    },
    server: {
        host: "127.0.0.1",
        port: 4179,
        strictPort: true,
    },
});
