import type { PageStates } from "./Pages.ts";
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

export const newExpState = (url?: URL): ExperimentState => {
    if (!url) {
        return nullExpState();
    }
    return {
        user: {
            pid: url.searchParams.get("pid") ?? undefined,
            source: url.searchParams.get("source") ?? url.searchParams.get("platform") ?? undefined,
        },
        session: {
            role: url.searchParams.get("role") ?? undefined,
        },
        pages: {},
        signature: null,
    };
};
