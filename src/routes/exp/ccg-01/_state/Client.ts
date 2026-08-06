import type { ActionResult } from "@sveltejs/kit";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import type { ExperimentState } from "./ExperimentState.ts";
import { pageNameFromRoute } from "./Pages.ts";
import { applyAction } from "$app/forms";

import debugLib from "debug";
const debug = debugLib("ccg-01:client:requestNextPageCookie");
import { deserialize } from "$app/forms";

export const requestNextPageCookie = async (
    expState: ExperimentState,
): Promise<
    { expState: ExperimentState; error?: string }
> => {
    let error = undefined;
    const currentPageName = pageNameFromRoute(page.url.pathname);
    if (!currentPageName) {
        return { expState, error: "No current page name" };
    }

    if (!expState.pages[currentPageName]?.completed) {
        const response = await fetch(`?/requestNextPageCookie`, {
            method: "POST",
            body: new FormData(),
        });

        const result = deserialize(await response.text());

        if (result.type === "success" && result.data) {
            const { expState: newExpState, error: newError } = result.data as {
                expState: ExperimentState;
                error?: string;
            };
            Object.assign(expState, newExpState);
            error = newError;
        }

        if (result.type === "redirect") {
            await applyAction(result);
            return { expState, error };
        }
    }

    return { expState, error };
};

// import { deserialize } from "$app/forms";
// export async function requestNextPageCookie(destination?: string): Promise<Response> {
//     const formData = new FormData();
//     formData.append("destination", destination ?? "");
//     const response: Response = await fetch("?/requestNextPageCookie", {
//         method: "POST",
//         body: formData,
//     });
//     // console.log(response); // Response object
//     // console.log(response.text()); // Promise { <pending> }
//     // console.log(await response.text()); // String: {"type":"redirect","status":303,"location":"/experiments/ccg-01/game_description_2"}
//     // console.log(await response.json()); // ActionResult object: {"type":"redirect","status":303,"location":"/experiments/ccg-01/game_description_2"}
//     // console.log(deserialize(await response.text())); // ActionResult object: {"type":"redirect","status":303,"location":"/experiments/ccg-01/game_description_2"}
//     return response;
// }
