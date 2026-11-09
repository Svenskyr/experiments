# experiments

Repo for site/experiments: experimental economics

Runs on Cloudflare Workers (`@sveltejs/adapter-cloudflare`); Bun for packages and scripts.

```sh
bun install
cp .env.example .env        # fill in values (read by both vite dev and wrangler dev)

bun run dev                 # Vite dev server with HMR
bun run preview             # build, then run the real Worker locally in workerd (wrangler dev)
bun run preview:env         # same, using the `preview` env from wrangler.jsonc
bun run build               # build:assets (cloze IR + chevron SVGs) + check:frozen + vite build
bun run check               # check:frozen + svelte-check
bun run mock-participant -- --count 3 --dry-run

bun run versions            # library modules, versions, and who imports them
bun run check:frozen        # lint module versions; verify frozen experiments
bun run freeze <study-id>   # freeze an experiment when it goes live (--accept / --amend "<reason>")
```

Conventions: `docs/style-guide/`. Versioning and freezing: `docs/style-guide/04-versioning.md`.

Deploys run on Workers Builds (`main` → `experiments`, preview branch → `experiments-preview`).
Manual fallback: `bun run deploy` / `bun run deploy:preview`.
