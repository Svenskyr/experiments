/**
 * Run `vite build` with placeholder values for missing *dynamic* env vars.
 *
 * SvelteKit's post-build "Analysing routes" step loads the server bundle and validates every
 * variable declared in `src/env.ts`, including dynamic (runtime) ones such as the PRIVATE_*
 * secrets. Their values are never inlined into the build: at runtime they are read from the
 * Worker's secrets and validated again, so a missing secret still fails loudly in production.
 *
 * Supplying placeholders here means CI (Workers Builds) needs only the static PUBLIC_* build
 * variables, and production secrets never have to be exposed to the build environment.
 *
 * Static variables are left alone: they are inlined, so they must be real at build time.
 */
import { loadEnv } from "vite";
import { variables } from "../src/env.ts";

const PLACEHOLDER = "__build_placeholder__";

const mode = process.env.MODE ?? "production";
const fileEnv = loadEnv(mode, process.cwd(), "");

const placeholders: Record<string, string> = {};
for (const [name, config] of Object.entries(variables)) {
    if ((config as { static?: boolean }).static) continue;
    if (process.env[name] !== undefined || fileEnv[name] !== undefined) continue;
    placeholders[name] = PLACEHOLDER;
}

const names = Object.keys(placeholders);
if (names.length > 0) {
    console.log(`vite-build: using build-time placeholders for dynamic env vars: ${names.join(", ")}`);
}

const proc = Bun.spawn(["vite", "build", ...process.argv.slice(2)], {
    env: { ...process.env, ...placeholders },
    stdio: ["inherit", "inherit", "inherit"],
});
process.exit(await proc.exited);
