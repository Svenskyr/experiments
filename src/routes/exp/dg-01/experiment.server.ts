import { PRIVATE_DG_01_SECRET_KEY } from "$app/env/private";
import type { StateCookieConfig } from "#lib/exp/state/v1/Cookie.server.ts";
import { BASE_PATH } from "#exp/dg-01/experiment.ts";

/** Call per request: the secret is a Worker secret, read at runtime. */
export function stateCookie(): StateCookieConfig {
    return { name: "exp-dg-01-state", path: BASE_PATH, secret: PRIVATE_DG_01_SECRET_KEY };
}
