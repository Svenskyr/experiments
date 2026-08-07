import { PRIVATE_CCG_01_SECRET_KEY } from "$env/static/private";
import { getLogger } from "$lib/server/logger.server.ts";
import { type ExperimentState, newExpState } from "./ExperimentState.ts";
import { type Cookies, redirect } from "@sveltejs/kit";

export const STATE_COOKIE_NAME = "exp-ccg-01-state";
export const STATE_COOKIE_PATH = "/exp/ccg-01";
export const STATE_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
export const ACTIVITY_EXPIRATION_LIMIT = 1000 * 60 * 60 * 6; // 6 hours
// export const ACTIVITY_EXPIRATION_LIMIT = 1000 * 5; // 5 seconds (for testing)

export async function signStateCookie(expState: ExperimentState): Promise<ExperimentState> {
    const message = JSON.stringify({
        user: expState.user,
        session: expState.session,
        pages: expState.pages,
    });
    const bytes = await generateSignatureBytes(message, PRIVATE_CCG_01_SECRET_KEY);
    expState.signature = encodeBase64(bytes);
    return expState;
}

export async function verifyStateCookie(
    cookies: Cookies,
): Promise<{ expState: ExperimentState | null; valid: boolean; expired: boolean }> {
    const log = getLogger({ mod: "ccg-01/_state/Cookie.ts", fn: "verifyStateCookie()" });

    const stateString = cookies.get(STATE_COOKIE_NAME);
    if (!stateString) {
        log.warn("No state cookie found");
        return { expState: null, valid: false, expired: false };
    }
    const expState = JSON.parse(stateString);
    const valid = await verifyCookieSignature(expState);
    const expired = ACTIVITY_EXPIRATION_LIMIT
        < (Date.now() - (expState.session.lastActiveAt ?? Date.now()));
    log.debug({ expState, valid, expired }, "State cookie verified");
    return { expState, valid, expired };
}

export async function validateStateCookieOrRedirect(
    cookies: Cookies,
): Promise<{ expState: ExperimentState }> {
    const log = getLogger({ mod: "ccg-01/_state/Cookie.ts", fn: "validateStateCookie()" });
    const { expState, valid, expired } = await verifyStateCookie(cookies);

    if (!expState || !valid) {
        log.warn("Invalid or expired state cookie; redirecting to gate page with new expState");
        const newState = newExpState();
        await setStateCookie(cookies, newState);
        redirect(303, "/exp/ccg-01");
    }

    if (expired && expState.session.role === "participant") {
        log.warn("Expired participant state cookie; redirecting to gate page for quota recheck");
        expState.session.withinQuota = undefined;
        expState.session.lastActiveAt = Date.now();
        await setStateCookie(cookies, expState);
        // Note: If you see an issue with expState getting out of sync here,
        // try returning both expState and the redirect,
        // then Object.assign(expState, newExpState) in the client,
        // then apply the redirect.
        redirect(303, "/exp/ccg-01");
    }
    return { expState };
}

async function verifyCookieSignature(expState: ExperimentState): Promise<boolean> {
    const providedBytes = decodeBase64(expState.signature);
    const message = JSON.stringify({
        user: expState.user,
        session: expState.session,
        pages: expState.pages,
    });
    const expectedBytes = await generateSignatureBytes(message, PRIVATE_CCG_01_SECRET_KEY);
    if (providedBytes === null || expectedBytes === null) return false;
    return constantTimeEqualityCheck(providedBytes, expectedBytes);
}

const STATE_COOKIE_SET_OPTIONS = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
};

export async function setStateCookie(cookies: Cookies, expState: ExperimentState) {
    expState = await signStateCookie(expState);
    cookies.set(STATE_COOKIE_NAME, JSON.stringify(expState), {
        ...STATE_COOKIE_SET_OPTIONS,
        maxAge: STATE_COOKIE_MAX_AGE,
    });
}

export function clearStateCookie(cookies: Cookies) {
    cookies.delete(STATE_COOKIE_NAME, STATE_COOKIE_SET_OPTIONS);
}

async function generateSignatureBytes(message: string, secret: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const key: CryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const bytes: ArrayBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(message),
    );
    return new Uint8Array(bytes);
}

function encodeBase64(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // URL-safe
}

function decodeBase64(base64: string | null): Uint8Array | null {
    if (!base64) return null;
    try {
        const standard = base64.replace(/-/g, "+").replace(/_/g, "/");
        const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
        const binary = atob(padded);
        return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    } catch {
        return null;
    }
}

function constantTimeEqualityCheck(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}
