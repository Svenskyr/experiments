// https://docs.prolific.com/api-reference/submissions/get-submission
// Prolific provides a SESSION_ID url parameter
// (`GET https://api.prolific.com/api/v1/submissions/:id/`)

// - `id`: string. %SESSION_ID% (identifies a particular submission)
// - `started_at`: string. The date and time that the user started the submission (UTC)
// - `status`: enum. { ACTIVE, APPROVED, PARTIALLY APPROVED, AWAITING REVIEW, REJECTED, RESERVED,
//   RETURNED, TIMED-OUT, SCREENED OUT, UNKNOWN }
// - `completed_at`: string | null. The time the submission was completed at.
// - `entered_code`: string | null. The completion code used by the participant to complete the study.
// - `participant`: string. Participant ID (pid).
// - `parent_study_id`: string | null. ID of the study’s parent, if any. (This applies to
//   representative sample and quota studies.)
// - `bonus_payments`: double[]. Bonus payments that have been paid on the submission. Returned in
//   pence / cents.
// - `return_requested`: datetime | null. The date and time when a return request for the submission
//   was made.

// curl https://api.prolific.com/api/v1/submissions/id/ \
//      -H "Authorization: Token <token>"

// {
//     "id": "625d4a831bcda2d59ac5a251",
//     "started_at": "string",
//     "status": "APPROVED",
//     "study_id": "60aca280709ee40ec37d4885",
//     "completed_at": "string",
//     "entered_code": "8E8AC860",
//     "participant": "60bf9310e8dec401be6e9615",
//     "bonus_payments": [
//       1000,
//       2536
//     ]
// }

/*
Study URL:
https://experiments.sstark.dev/exp/ccg-01
    ?pid={{%PROLIFIC_PID%}}
    &study_id={{%STUDY_ID%}}
    &p_session_id={{%SESSION_ID%}}
    &platform=prolific
    &role=participant
*/

import { PRIVATE_PROLIFIC_API_KEY } from "$env/static/private";
import type { PlatformParticipantClaims } from "./PlatformClaims.ts";

export async function verifyProlificSession(
    claim: PlatformParticipantClaims,
): Promise<{ success: boolean; error: string | null }> {
    const response = await fetch(
        `https://api.prolific.com/api/v1/submissions/${claim.platformSessionId}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Token ${PRIVATE_PROLIFIC_API_KEY}`,
            },
        },
    );
    if (!response.ok) {
        return {
            success: false,
            error: `Failed to verify Prolific session: ${response.statusText}`,
        };
    }
    const data = await response.json();

    const okStudyId = data.study_id === claim.studyId;
    const okParticipantId = data.participant === claim.pid;
    const okSessionId = data.id === claim.platformSessionId;

    const success = okStudyId && okParticipantId && okSessionId;
    const error = success
        ? null
        : `Prolific session verification failed: ${
            !okStudyId
                ? "Study ID mismatch"
                : !okParticipantId
                ? "Participant ID mismatch"
                : !okSessionId
                ? "Session ID mismatch"
                : "Unknown error"
        }`;

    return { success, error };
}
