import { browser } from "$app/environment";
import { deserialize } from "$app/forms";

const LEGACY_LOCAL_STORAGE_KEYS = ["selectedAvatar", "ccg-v2-permutationTracker"] as const;

export function clearExperimentLocalStorage(): void {
    if (!browser) return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("exp_ccg_01:")) {
            keysToRemove.push(key);
        }
    }
    for (const key of keysToRemove) {
        localStorage.removeItem(key);
    }
    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
        localStorage.removeItem(key);
    }
}

export type FinalizeClientSessionResult = {
    ok: boolean;
    sessionCompleted: boolean;
};

export async function finalizeClientSession(): Promise<FinalizeClientSessionResult> {
    const response = await fetch(`?/finalizeClientSession`, {
        method: "POST",
        body: new FormData(),
    });
    const result = deserialize(await response.text());

    if (result.type === "success" && result.data) {
        return result.data as FinalizeClientSessionResult;
    }
    return { ok: false, sessionCompleted: false };
}
