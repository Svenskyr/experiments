import { type Cookies, redirect } from "@sveltejs/kit";
import { getLogger } from "#lib/server/logger.server.ts";
import { type ExperimentState, newExpState } from "./ExperimentState.ts";

const MOD = "exp/state/v1/Cookie.server";

/** One experiment's state cookie. Build it per request, so the secret is read at runtime. */
export interface StateCookieConfig {
    name: string; // "exp-ccg-01-state"
    path: string; // The experiment's base path. Scopes the cookie; invalid cookies redirect here.
    secret: string; // HMAC-SHA256 key. One per experiment; never shared.
}

export const STATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds
export const ACTIVITY_EXPIRATION_LIMIT = 1000 * 60 * 60 * 6; // 6 hours, in milliseconds

export async function verifyStateCookie(
    config: StateCookieConfig,
    cookies: Cookies,
): Promise<{ expState: ExperimentState | null; valid: boolean; expired: boolean }> {
    const stateString = cookies.get(config.name);
    if (!stateString) return { expState: null, valid: false, expired: false };

    let expState: ExperimentState;
    try {
        expState = JSON.parse(stateString);
    } catch {
        return { expState: null, valid: false, expired: false };
    }
    // Nothing in expState is trusted until the signature over it is verified.
    const valid = await verifySignature(expState, config.secret);
    const expired = valid
        && ACTIVITY_EXPIRATION_LIMIT < Date.now() - (expState.session.lastActiveAt ?? Date.now());
    return { expState, valid, expired };
}

/** For mutating actions. Redirects to the gate unless the cookie is valid and active. */
export async function validateStateCookieOrRedirect(
    config: StateCookieConfig,
    cookies: Cookies,
): Promise<{ expState: ExperimentState }> {
    const log = getLogger({ mod: MOD, fn: "validateStateCookieOrRedirect" });
    const { expState, valid, expired } = await verifyStateCookie(config, cookies);

    if (!expState || !valid) {
        log.warn({ cookie: config.name }, "Invalid state cookie; redirecting to gate");
        await setStateCookie(config, cookies, newExpState());
        redirect(303, config.path);
    }

    if (expired && expState.session.role === "participant") {
        log.warn({ cookie: config.name }, "Expired participant; redirecting to gate");
        expState.session.withinQuota = undefined; // The gate rechecks the quota
        expState.session.lastActiveAt = Date.now();
        await setStateCookie(config, cookies, expState);
        redirect(303, config.path);
    }
    return { expState };
}

/** Sign `expState` in place and write it to the cookie. */
export async function setStateCookie(
    config: StateCookieConfig,
    cookies: Cookies,
    expState: ExperimentState,
): Promise<void> {
    const bytes = await signatureBytes(signedMessage(expState), config.secret);
    expState.signature = encodeBase64(bytes);
    cookies.set(config.name, JSON.stringify(expState), {
        ...cookieOptions(config),
        maxAge: STATE_COOKIE_MAX_AGE,
    });
}

export function clearStateCookie(config: StateCookieConfig, cookies: Cookies): void {
    cookies.delete(config.name, cookieOptions(config));
}

/** Advance the flow: mark pages completed, grant pages, revoke pages; then re-sign the cookie.
Every page action that advances the flow calls this. */
export async function setNextPageCookie<P extends string>(
    config: StateCookieConfig,
    cookies: Cookies,
    complete: P[],
    grant: P[],
    revoke: P[],
): Promise<{ expState: ExperimentState }> {
    const { expState } = await validateStateCookieOrRedirect(config, cookies);

    for (const page of complete) {
        expState.pages[page] ??= { completed: false, permitted: false };
        expState.pages[page].completed = true;
    }
    for (const page of grant) {
        expState.pages[page] ??= { completed: false, permitted: false };
        expState.pages[page].permitted = true;
    }
    for (const page of revoke) {
        expState.pages[page] ??= { completed: false, permitted: false };
        expState.pages[page].permitted = false;
    }

    expState.session.lastActiveAt = Date.now();
    await setStateCookie(config, cookies, expState);
    return { expState };
}

/* Internal */

function cookieOptions(config: StateCookieConfig) {
    // `secure` is left to SvelteKit: true everywhere except http://localhost.
    return { path: config.path, httpOnly: true, sameSite: "lax" as const };
}

function signedMessage(expState: ExperimentState): string {
    return JSON.stringify({
        user: expState.user,
        session: expState.session,
        pages: expState.pages,
    });
}

async function verifySignature(expState: ExperimentState, secret: string): Promise<boolean> {
    if (typeof expState !== "object" || expState === null) return false;
    if (typeof expState.signature !== "string") return false;
    if (typeof expState.session !== "object" || expState.session === null) return false;
    if (typeof expState.pages !== "object" || expState.pages === null) return false;
    const provided = decodeBase64(expState.signature);
    if (provided === null) return false;
    const expected = await signatureBytes(signedMessage(expState), secret);
    return constantTimeEqual(provided, expected);
}

async function signatureBytes(message: string, secret: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function encodeBase64(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // URL-safe
}

function decodeBase64(base64: string): Uint8Array | null {
    try {
        const standard = base64.replace(/-/g, "+").replace(/_/g, "/");
        const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
        return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    } catch {
        return null;
    }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}
