import { redirect } from "@sveltejs/kit";
import { participantRandomizationKey } from "#lib/exp/state/v1/ExperimentState.ts";
import { maxPage, pageNameFromRoute, pagePath } from "#lib/exp/state/v1/Pages.ts";
import { assignAvatars } from "#exp/dg-01/_components/Avatars/AvatarAssignment.ts";
import { EXPERIMENT } from "#exp/dg-01/experiment.ts";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ url, parent }) => {
    const { expState } = await parent();

    // Page ACL
    if (!expState.pages[pageNameFromRoute(EXPERIMENT, url.pathname)]?.permitted) {
        redirect(303, pagePath(EXPERIMENT, maxPage(EXPERIMENT, expState.pages)));
    }

    // Treatment: the participant's avatar and the other player's avatar.
    return { avatars: assignAvatars(participantRandomizationKey(expState)) };
};
