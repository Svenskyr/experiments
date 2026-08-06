<script lang="ts">
import { getDebugger } from "$lib/common/Debugger/v2/Debugger.svelte.ts";
const debug = getDebugger().extend("+consent").debug;
import { enhance } from "$app/forms";
import FeedbackWrapper from "$experiments/ccg-01/_components/FeedbackWrapper.svelte";
import { getExpState } from "$experiments/ccg-01/_state/ExperimentState.ts";
const expState = $derived(getExpState());

import { maxPage } from "$experiments/ccg-01/_state/Pages.ts";
import { goto } from "$app/navigation";
import type { SubmitFunction } from "@sveltejs/kit";

const submitConsent: SubmitFunction = ({ cancel }) => {
    if (expState.pages.consent?.completed) {
        debug("consent already completed");
        cancel();
        goto(`/experiments/ccg-01/${maxPage(expState.pages)}`);
        return;
    }

    return async ({ result, update }) => {
        if (result.type === "success" && result.data?.expState) {
            Object.assign(expState, result.data.expState);
            await goto(`/experiments/ccg-01/${maxPage(expState.pages)}`);
            return;
        }

        if (result.type === "failure" && result.data?.error) {
            console.error("error", result.data?.error);
        }

        await update();
    };
};
</script>

<div class="page-block">
    <h1>Welcome!</h1>

    <p>
        The contents of this study will be reviewed and approved by the Institutional Review Board
        (IRB) of George Mason University.*
    </p>

    <!-- <span class="footnote"
    >*This study is not yet collecting data and is currently in the approval process.</span> -->

    <h2>Summary</h2>

    <ol>
        <li>You are being asked to participant in this research study.</li>
        <li>
            Your participation in this study is voluntary and you may choose to exit at any time.
        </li>
        <li>This study's procedures and use of data are provided in detail below.</li>
        <li>
            This study is being conducted by Sven Stark (<a href="mailto:sstark@gmu.edu"
            >sstark@gmu.edu</a>) as part of dissertation research at George Mason University.
        </li>
        <li>
            The principle investigator supervising this study is Johanna Mollerstrom (<a
                href="mailto:jmollers@gmu.edu"
            >jmollers@gmu.edu</a>).
        </li>
        <li>
            Questions and concerns should be directed to <a href="mailto:sstark@gmu.edu"
            >sstark@gmu.edu</a>. Feedback regarding the study can also be provided within the study
            itself by clicking on the 🗨️ icons.
        </li>
    </ol>

    <FeedbackWrapper page="consent" label="consent summary" />
</div>

<div class="page-block">
    <div class="multiple-details">
        <!-- <details>
            <summary><h3>Transparency in study details</h3></summary>

            <p>
                The instructions of this study intend to accurately describe the relationship
                between
                <em>your choices</em> and <em>your outcomes</em>. Some choices in this study are
                incentivized, meaning that these choices will affect your material outcome (<em>your
                    monetary reward</em>) at the end of the study.
            </p>

            <p>For maximum transparency, the instructions are intended to:</p>
            <ul>
                <li>Be as simple and accurate as possible.</li>
                <li>Not deceive or mislead you.</li>
            </ul>

            <p>
                If a choice or response affects your material outcome, then this will be explicitly
                stated. If a choice or response is not stated to affect your material outcome, then
                it will not do so.
            </p>
        </details>

        <details>
            <summary><h3>Transparency in data collection</h3></summary>

            <p>This study collects the following data:</p>
            <ul>
                <li>Your choices and responses.</li>
                <li>Study metadata.</li>
            </ul>

            <p>
                The data on your choices and responses is being collected for the purpose of
                scholarly publishing and developing an improved understanding of human behavior.
                Following standard study practices, specific details regarding the purpose of this
                study cannot be revealed until after data collection is complete. If you're
                interested in knowing more, please contact the researchers through the method noted
                above.
            </p>

            <p>
                Study metadata is technical information not related to your choices and responses.
                Metadata is collected in order to improve the experience of participating in this
                and future studies.
            </p>

            <p>
                When you complete this study, your data is associated with your Prolific
                identification. This is required for us to pay you at the end of the study.
            </p>

            <p>
                After this study's collection of data and payment of rewards is complete, any
                information that could be used to identify participants will be removed from the
                data set. The anonymized (de-identifized) data set will be used in this study's
                analysis and may be used in future studies.
            </p>

            <p>
                General study details, anonymized data, and analysis results may be provided upon
                request to this study's researchers after the study's conclusion.
            </p>
        </details> -->

        <details>
            <summary>
                <h2>Informed consent</h2>
            </summary>
            <p class="center" style="font-weight: bold">
                Investigators: Sven Stark, Johanna Mollerstrom
            </p>

            <p class="center" style="font-weight: bold">Funding source: George Mason University</p>

            <h3>Participation Details</h3>
            <ul>
                <li>
                    <strong>Your Role:</strong> As a participant, you will be asked to play multiple
                    rounds of a coordination game with other participants. We'll then ask you some
                    questions at the end of the study.
                </li>
                <li>
                    <strong>Eligibility Criteria for Participation:</strong> To participate in this
                    study, you must be at least 18 years old.
                </li>
                <li>
                    <strong>Time Commitment:</strong> This study is expected to take 15-20 minutes
                    on average.
                </li>
                <li>
                    <strong>How many people will participate?</strong> This study is intended to have
                    approximately 200 participants.
                </li>
                <li>
                    <strong>Risks:</strong> There are no anticipated risks or discomforts related to
                    your participation.
                </li>
                <li>
                    <strong>Benefits of Participation:</strong>
                    {#if expState.session.role === "participant"}
                    You will be contributing to academic research and our collective domain of knowledge.
                    Additionally, you will receive material compensation for completing this study.
                    {:else}
                    You will be contributing to academic research and our collective domain of knowledge.
                    {/if}
                </li>
                <li>
                    <strong>Voluntary Participation:</strong> Your participation is entirely
                    voluntary, and you may withdraw from the study at any time without any
                    consequences.
                </li>
                <li>
                    <strong>Future Research:</strong> De-identified data (data with all identifying
                    information removed) may be shared with other researchers for use in future
                    studies or research.
                </li>
            </ul>

            <h3>Confidentiality and Data Security</h3>
            <p>We’ll collect the following identifying information for the research:</p>
            <ul>
                <li>
                    Your Prolific ID. This is required in order to provide payment to participants.
                </li>
            </ul>

            <h3>Where will my data be stored and how will it be protected?</h3>
            <p>
                This study’s data will be stored in secure IT systems provided by George Mason
                University. While it is understood that no computer transmission can be perfectly
                secure, reasonable efforts will be made to protect the confidentiality of your
                transmission.
            </p>

            {#if expState.session.role === "participant"}
            <h3>How long will my data be retained?</h3>
            <p>This study is required to retain data for a minimum of five years.</p>
            {/if}

            <h3>Who can see my data?</h3>
            <p>
                This study’s raw data will only be accessible by the research personnel specified
                above. All other versions of this study’s data will be de-identified to protect
                participant anonymity.
            </p>

            {#if expState.session.role === "participant"}
            <h3>Participant Compensation</h3>
                <p>You will earn:</p>
                <ul>
                    <li>$2 for completing this study.</li>
                    <li>Up to $1 for correctly answering questions about this study's instructions.</li>
                    <li>Up to $9.60 for completing all game rounds, conditional on game outcomes.</li>
                </ul>
                <p>
                    Payments will be delivered in USD through electronic transfer. Under U.S. federal
                    tax law, you may have individual responsibilities for disclosing the dollar value of
                    the incentive received on this study.
                </p>
            {/if}
            
            <h3>Contact Information</h3>
            <p>
                If you have questions, concerns, or complaints, or think the research has harmed
                you, please contact the research team at <a href="mailto:sstark@gmu.edu"
                >sstark@gmu.edu</a>.
            </p>

            <p>
                This research has been reviewed according to George Mason University procedures
                governing your participation in this research. You may contact the George Mason
                University Institutional Review Board office at <a href="mailto:irb@gmu.edu"
                >irb@gmu.edu</a> if you have questions or comments regarding your rights as a
                participant in the study.
            </p>
        </details>
        <FeedbackWrapper page="consent" label="consent form" />
    </div>

    <p class="center" style="font-weight: bold">
        By continuing, you acknowledge that you have read and understood the above information, and
        that you voluntarily agree to participate in this study under the terms described above.
    </p>

    <form method="POST" action="?/submitConsent" class="center" use:enhance={submitConsent}>
        <!-- <input
            class="confirm-email"
            type="email"
            id="confirm-email"
            name="confirm-email"
            placeholder="Confirm your email"
            autocomplete="off"
        /> -->
        <button class="agree-button exp-default-button" type="submit">I agree</button>
    </form>
</div>
