import { dev } from "$app/env";
import { type Cookies, error, redirect } from "@sveltejs/kit";
import { clearStateCookie } from "#lib/exp/state/v1/Cookie.server.ts";
import { stateCookie } from "#exp/dg-01/experiment.server.ts";
import { BASE_PATH } from "#exp/dg-01/experiment.ts";

export const actions = {
    /** Dev only: forget this participant and start over with a new avatar assignment. */
    restart: async ({ cookies }: { cookies: Cookies }) => {
        if (!dev) error(404, "Not found");
        clearStateCookie(stateCookie(), cookies);
        redirect(303, BASE_PATH);
    },
};
