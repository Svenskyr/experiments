# experiments

Repo for site/experiments: experimental economics

Runs on Cloudflare Workers (`@sveltejs/adapter-cloudflare`); Bun for packages and scripts.

```sh
bun install
cp .env.example .env        # fill in values (read by both vite dev and wrangler dev)

bun run dev                 # Vite dev server with HMR
bun run preview             # build, then run the real Worker locally in workerd (wrangler dev)
bun run preview:env         # same, using the `preview` env from wrangler.jsonc
bun run build               # build:assets (cloze IR + chevron SVGs) + vite build
bun run check               # svelte-check
bun run mock-participant -- --count 3 --dry-run
```

Deploys run on Workers Builds (`main` → `experiments`, preview branch → `experiments-preview`).
Manual fallback: `bun run deploy` / `bun run deploy:preview`.
