import { createContext } from "svelte";
import { getSearchParam } from "#lib/exp/urlParams/v1/urlParams.ts";
import type { PageStates } from "./Pages.ts";

export const [getExpState, setExpState] = createContext<ExperimentState>();

/** The signed state cookie's content. Authoritative for identity and page permissions. */
export interface ExperimentState {
    user: {
        userId?: string | undefined; // experiments.users.user_id
        authUserId?: string | undefined; // auth.users.id
        pid?: string | undefined; // user-provided identifier
        source?: string | undefined;
        platform?: string | undefined;
        studyId?: string | undefined;
    };
    session: {
        sessionId?: string | undefined; // experiments.sessions.session_id
        role?: string | undefined;
        platformSessionId?: string | undefined;
        withinQuota?: boolean | undefined;
        lastActiveAt?: number | undefined;
    };
    pages: PageStates;
    signature: string | null;
}

/** A fresh state. With `url`, platform claims in its query string are copied in. */
export function newExpState(url?: URL): ExperimentState {
    if (!url) return { user: {}, session: {}, pages: {}, signature: null };
    return {
        user: {
            pid: getSearchParam(url, "pid") ?? undefined,
            source: getSearchParam(url, "source") ?? getSearchParam(url, "platform") ?? undefined,
        },
        session: {
            role: getSearchParam(url, "role") ?? undefined,
        },
        pages: {},
        signature: null,
    };
}

/** Stable per-participant key for seeded randomization (session preferred). */
export function participantRandomizationKey(expState: ExperimentState): string {
    return expState.session.sessionId ?? expState.user.authUserId ?? "";
}

export function questionRandSeed(expState: ExperimentState, qid: string): string {
    return `${participantRandomizationKey(expState)}-${qid}`;
}
