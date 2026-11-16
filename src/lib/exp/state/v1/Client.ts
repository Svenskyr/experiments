import { applyAction, deserialize } from "$app/forms";
import { page } from "$app/state";
import type { ExperimentState } from "./ExperimentState.ts";
import { type ExperimentDefinition, pageNameFromRoute } from "./Pages.ts";

/** Ask the current page's `requestNextPageCookie` action to advance the flow; merge the result
into `expState`. Does nothing on the gate or if the current page is already completed. */
export async function requestNextPageCookie(
    experiment: ExperimentDefinition,
    expState: ExperimentState,
): Promise<void> {
    const currentPageName = pageNameFromRoute(experiment, page.url.pathname);
    if (!currentPageName || expState.pages[currentPageName]?.completed) return;

    const response = await fetch("?/requestNextPageCookie", {
        method: "POST",
        body: new FormData(),
    });
    const result = deserialize(await response.text());

    if (result.type === "success" && result.data?.expState) {
        Object.assign(expState, result.data.expState as ExperimentState);
    } else if (result.type === "redirect") {
        await applyAction(result);
    } else {
        console.error("requestNextPageCookie failed", result);
    }
}
