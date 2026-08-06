<script lang="ts">
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+registration").debug;

import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
let expState = $derived(getExpState());

let { data } = $props();
const { supabase } = $derived(data);
import { browser } from "$app/environment";
import FeedbackWrapper from "$exp/ccg-01/_components/FeedbackWrapper.svelte";
import { onMount, tick } from "svelte";
import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
import Turnstile from "$lib/common/Turnstile/Turnstile.svelte";
let turnstile = $state<ReturnType<typeof Turnstile> | null>(null);
let authUserId = $state<string | undefined>(undefined);

function setAuthUserId(id: string) {
    authUserId = id;
    expState.user.authUserId = id;
}

onMount(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user?.id) {
        authUserId = currentSession.user.id;
        expState.user.authUserId = currentSession.user.id;
        return;
    }

    debug("Initiating anonymous signin...");
    await tick();
    if (!turnstile) {
        debug("Turnstile component not mounted");
        return;
    }
    await turnstile.ready();
    const token = await turnstile.getToken();
    if (!token) {
        debug("No Turnstile token provided for verification");
        return;
    }
    debug("Turnstile token received:", token);
    try {
        const { data: authData, error } = await supabase.auth
            .signInAnonymously({
                options: {
                    captchaToken: token,
                },
            });
        if (error || !authData?.user) {
            debug("Error during anonymous sign-in:", error);
            return;
        }
        setAuthUserId(authData.user.id);
    } catch (error) {
        debug("Error during Turnstile verification or anonymous sign-in:", error);
    }
});

import type {
    MultipleChoiceItem as MCQItem,
    MultipleChoiceQuestion as MCQ,
} from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.js";
import MultipleChoiceQuestion from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.svelte";
import { roleQuestion } from "$exp/ccg-01/(pages)/registration/roleQuestion.ts";
const question: MCQ = $state(roleQuestion);
const roles: MCQItem[] = $derived([...question.canonicalItems, ...question.userItems ?? []]);
const selectedRole: string | null = $derived.by(() => {
    if (expState.session.role) {
        return expState.session.role;
    }
    return roles.find((item) => item.isSelected)?.itemId ?? null;
});

import { enhance } from "$app/forms";
import type { ActionResult, SubmitFunction } from "@sveltejs/kit";
import { goto } from "$app/navigation";
import { maxPage } from "$exp/ccg-01/_state/Pages.ts";
import { getSyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
import {
    save as saveUserAgent,
    sync as syncUserAgent,
} from "$exp/ccg-01/_database/UserAgentDBM.ts";
const syncHandler = getSyncHandler();

let registrationForm = $state<HTMLFormElement | null>(null);
let inputPID = $state("");
let awaitingRegistration = $state(false);
/** Latch: we already fired (or completed) an automatic registration submit. */
let autoSubmitted = $state(false);
let registrationError = $state<string | null>(null);

const hasPid = $derived(Boolean(inputPID.trim()));
const hasRole = $derived(Boolean(selectedRole));
/** Role from entry (URL/state); MCQ selection does not set session.role. */
const enteredWithRole = $derived(Boolean(expState.session.role));
/** Auto-submit only for platform-style entry with a preset role; walk-ins use Submit. */
const autoSubmitEligible = $derived(enteredWithRole && hasPid);

const canSubmitRegistration = $derived(
    Boolean(hasPid && hasRole && authUserId),
);

type AutoSubmitBlocker =
    | "already_attempted"
    | "in_flight"
    | "no_form"
    | "already_registered"
    | "not_auto_submit_eligible"
    | "awaiting_auth"
    | "none";

function autoSubmitBlocker(): AutoSubmitBlocker {
    if (autoSubmitted || awaitingRegistration) {
        return autoSubmitted ? "already_attempted" : "in_flight";
    }
    if (!registrationForm) return "no_form";
    if (expState.session.sessionId) return "already_registered";
    if (!autoSubmitEligible) return "not_auto_submit_eligible";
    if (!authUserId) return "awaiting_auth";
    return "none";
}

$effect(() => {
    if (expState.user.pid && !inputPID) {
        inputPID = expState.user.pid;
    }
});

function beginRegistrationSubmit() {
    if (awaitingRegistration) return false;
    awaitingRegistration = true;
    registrationError = null;
    debug("Submitting registration...");
    return true;
}

async function handleRegistrationResult(result: ActionResult) {
    awaitingRegistration = false;
    if (result.type === "success" && result.data?.expState) {
        debug("Registration successful:", result.data.expState);
        Object.assign(expState, result.data.expState);
        const sessionId = expState.session.sessionId;
        if (sessionId) {
            void syncHandler.initDb(supabase, sessionId);
            saveUserAgent();
            syncUserAgent(syncHandler);
        }
        await goto(`${maxPage(expState.pages)}`, { replaceState: true });
    } else {
        registrationError = result.type === "failure"
            ? (result.data?.error as string | undefined) ?? "Registration failed"
            : "Registration failed";
        console.error("Registration failed:", result);
    }
}

const submitRegistration: SubmitFunction = ({ cancel }) => {
    if (!beginRegistrationSubmit()) {
        cancel();
        return;
    }
    return async ({ result }) => {
        await handleRegistrationResult(result);
    };
};

function tryAutoSubmitRegistration() {
    const blocker = autoSubmitBlocker();
    if (blocker !== "none") {
        return;
    }
    debug("Auto-submitting registration...");
    autoSubmitted = true;
    registrationForm!.requestSubmit();
}

$effect(() => {
    tryAutoSubmitRegistration();
});
</script>

<div class="page-block center-content">
    <h1>Registration</h1>

    <form
        bind:this={registrationForm}
        method="POST"
        action="?/registerForExperiment"
        use:enhance={submitRegistration}
    >
        {let status = $derived.by(() => {
            if (!authUserId) return "Connecting...";
            if (awaitingRegistration) return "Submitting...";
            return "Submit";
        })}

        <input
            type="text"
            id="PID"
            name="PID"
            placeholder={`Enter your${expState.user.source ? ` ${expState.user.source}` : ""} ID here...`}
            bind:value={inputPID}
            required
            readonly={awaitingRegistration || !!expState.user.pid}
        />

        {#if !expState.session.role}
            <MultipleChoiceQuestion {question} />
        {/if}
        <input type="hidden" name="role" value={selectedRole ?? ""} />

        <button
            type="submit"
            class="exp-default-button"
            class:disabled={!canSubmitRegistration || awaitingRegistration}
        >{status}</button>
        {#if registrationError}
            <p class="error">{registrationError}</p>
        {/if}
    </form>

    {#if browser && !authUserId}
        <Turnstile
            bind:this={turnstile}
            siteKey={PUBLIC_TURNSTILE_SITE_KEY}
        />
    {/if}

    <FeedbackWrapper page="registration" label="registration form" />

</div>

<style>
form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: fit-content;
    padding: 1rem;
    align-items: center;
    border: 4px solid transparent;
    & button {
        width: fit-content;
        &.disabled {
            pointer-events: none;
        }
    }
}
</style>
