<script lang="ts">
/* General */
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+quota").debug;
import FeedbackWrapper from "$exp/ccg-01/_components/FeedbackWrapper.svelte";
import { getExpState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { enhance } from "$app/forms";
const expState = $derived(getExpState());
import type { SubmitFunction } from "@sveltejs/kit";
const quotaRoles = ["participant", "over-quota", "over-quota-buffer"];
const gateRoles = [...quotaRoles, "failed-platform-verification"];
import { resolvePlatformParticipantClaims } from "$lib/exp/platform-api/PlatformClaims.ts";
let checkQuotaForm: HTMLFormElement | null = $state(null);
import { goto } from "$app/navigation";
import { maxPage } from "$exp/ccg-01/_state/Pages.ts";

let checkingQuota = $state(false);
let checkQuotaCooldown = $state(0);
let quotaError = $state<string | null>(null);
let cooldownIntervalId: number | null = null;
let autoQuotaCheckStarted = $state(false);

import { page } from "$app/state";

const isReturningParticipant = $derived(Boolean(expState.session.sessionId));
const gateClaims = $derived(resolvePlatformParticipantClaims(page.url, expState));
const needsQuotaCheck = $derived(
    expState.session.withinQuota === undefined
        || expState.session.role === "failed-platform-verification",
);

function tryAutoSubmitQuotaCheck() {
    if (
        autoQuotaCheckStarted
        || checkingQuota
        || checkQuotaCooldown > 0
        || !checkQuotaForm
        || !needsQuotaCheck
    ) {
        return;
    }
    autoQuotaCheckStarted = true;
    debug("Auto-submitting quota check...");
    checkQuotaForm.requestSubmit();
}

$effect(() => {
    tryAutoSubmitQuotaCheck();
});

function startCooldown() {
    checkQuotaCooldown = 10; // seconds
    cooldownIntervalId = window.setInterval(() => {
        checkQuotaCooldown -= 1;
        if (checkQuotaCooldown <= 0 && cooldownIntervalId) {
            debug("checkQuota cooldown complete");
            window.clearInterval(cooldownIntervalId);
            cooldownIntervalId = null;
        }
    }, 1000);
}

const submitCheckQuota: SubmitFunction = ({ cancel }) => {
    if (checkingQuota || checkQuotaCooldown > 0) {
        debug(
            `quota check already in progress or cooldown active; checkingQuota: ${checkingQuota}, checkQuotaCooldown: ${checkQuotaCooldown}`,
        );
        cancel();
        return;
    }

    debug("starting quota and platform verification check");
    checkingQuota = true;
    quotaError = null;
    startCooldown();

    return async ({ result }) => {
        if (result.type === "success" && result.data) {
            if (result.data.error) {
                quotaError = result.data.error;
                autoQuotaCheckStarted = false;
            } else {
                if (result.data.expState) {
                    Object.assign(expState, result.data.expState);
                }
                quotaError = result.data.quotaError ?? null;
            }
        }
        if (result.type === "failure" && result.data?.error) {
            quotaError = result.data.error;
            autoQuotaCheckStarted = false;
            console.error("error", result.data.error);
        }
        checkingQuota = false;
    };
};
</script>


{#if gateRoles.includes(expState.session.role ?? "")}
    <div class="page-block center-content">

        {#if isReturningParticipant && expState.session.withinQuota === undefined}
            <h2>Your session has expired</h2>
            {#if checkingQuota}
                <p>We're rechecking whether your slot in the study is still available. Please wait...</p>
            {:else}
                <p>Your session expired due to inactivity. We're about to recheck study quota.</p>
            {/if}
            {#if quotaError}
                <p>{quotaError}</p>
            {/if}

        {:else if checkingQuota || needsQuotaCheck}
            <h2>Checking study quota and verifying your session...</h2>

        {:else if expState.session.withinQuota === true}
            {#if isReturningParticipant}
                <h2>Welcome back! Your slot is still available.</h2>
                <p>You may resume where you left off.</p>
            {:else}
                <h2>Within study quota!</h2>
                <p>Please note that if you leave the study for more than 6 hours (360 minutes), you may lose your slot in the study.</p>
            {/if}

            <button
            type="button"
            class="exp-default-button"
            onclick={() => { goto(`/exp/ccg-01/${maxPage(expState.pages)}`, {
                replaceState: true,
            }) }}>
                {isReturningParticipant ? "Resume" : "Continue"}
            </button>

        {:else if expState.session.withinQuota === false}
            <h2>This study's quota has been reached. Sorry!</h2>
            
            <p>
                You may still complete this study for fun, but you will not be eligible for compensation.
            </p>
            <p>
                By continuing, you acknowledge that you will not receive any compensation for completing this study.
            </p>
            <form method="POST" action="?/downgradeParticipant">
                <button type="submit" class="exp-default-button">
                    Continue without compensation
                </button>
            </form>
        {/if}

        {#if needsQuotaCheck
            || expState.session.role === "over-quota-buffer"}
            <form
            method="POST"
            action="?/checkQuotaAndVerifyPlatformClaim"
            bind:this={checkQuotaForm}
            use:enhance={submitCheckQuota}
            >
                <input type="hidden" name="claimString" value={JSON.stringify(gateClaims)}>
                {#if !isReturningParticipant || expState.session.withinQuota !== undefined}
                    <button type="submit"
                    class="exp-default-button"
                    class:disabled={checkingQuota || checkQuotaCooldown > 0}>
                        {needsQuotaCheck ? "Check quota" : "Recheck"}
                        {checkQuotaCooldown > 0 ? ` (${checkQuotaCooldown})` : ""}
                    </button>
                {/if}
            </form>
        {/if}

        <FeedbackWrapper page="quota" label="quota check" />
    </div>
{/if}

<style>
p {
    text-align: center;
    max-width: 60%;
}
</style>
