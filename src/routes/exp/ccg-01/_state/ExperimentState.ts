import type { PageStates } from "./Pages.ts";
import { getSearchParam } from "$lib/exp/urlParams.ts";
import { createContext } from "svelte";

export const [getExpState, setExpState] = createContext<ExperimentState>();

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

export const nullExpState = (): ExperimentState => {
    return {
        user: {},
        session: {},
        pages: {},
        signature: null,
    };
};

/** Stable per-participant key for question display randomization (session preferred). */
export function participantRandomizationKey(expState: ExperimentState): string {
    return expState.session.sessionId ?? expState.user.authUserId ?? "";
}

export function questionRandSeed(expState: ExperimentState, qid: string): string {
    return `${participantRandomizationKey(expState)}-${qid}`;
}

export const newExpState = (url?: URL): ExperimentState => {
    if (!url) {
        return nullExpState();
    }
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
};
