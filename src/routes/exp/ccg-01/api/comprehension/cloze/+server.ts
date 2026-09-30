import type { ClozeBlankResponse } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import { submitClozeFieldset } from "$exp/ccg-01/_database/ClozeComprehensionServer.ts";
import { participantRandomizationKey } from "$exp/ccg-01/_state/ExperimentState.ts";
import { verifyStateCookie } from "$exp/ccg-01/_state/Cookie.ts";
import { json, type RequestHandler } from "@sveltejs/kit";

function parseBlankResponse(value: unknown): ClozeBlankResponse | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const { selectedItemId, freeText, wasSelectedItemIds } = value as Record<string, unknown>;
    if (typeof selectedItemId !== "string" || typeof freeText !== "string") {
        return null;
    }
    const response: ClozeBlankResponse = { selectedItemId, freeText };
    if (wasSelectedItemIds !== undefined) {
        if (
            !Array.isArray(wasSelectedItemIds)
            || !wasSelectedItemIds.every((id) => typeof id === "string")
        ) {
            return null;
        }
        response.wasSelectedItemIds = wasSelectedItemIds;
    }
    return response;
}

function parseBody(
    body: unknown,
):
    | {
        fieldsetQid: string;
        lines: { lineIndex: number; blanks: Record<string, ClozeBlankResponse> }[];
    }
    | { error: string } {
    if (!body || typeof body !== "object") {
        return { error: "Invalid request body" };
    }

    const { fieldsetQid, lines } = body as Record<string, unknown>;
    if (typeof fieldsetQid !== "string" || !fieldsetQid) {
        return { error: "fieldsetQid is required" };
    }
    if (!Array.isArray(lines) || lines.length === 0) {
        return { error: "lines must be a non-empty array" };
    }

    const parsedLines: { lineIndex: number; blanks: Record<string, ClozeBlankResponse> }[] = [];
    for (const entry of lines) {
        if (!entry || typeof entry !== "object") {
            return { error: "Invalid line entry" };
        }
        const { lineIndex, blanks } = entry as Record<string, unknown>;
        if (typeof lineIndex !== "number" || !Number.isInteger(lineIndex) || lineIndex < 0) {
            return { error: "Each line requires a non-negative integer lineIndex" };
        }
        if (!blanks || typeof blanks !== "object") {
            return { error: "Each line requires a blanks object" };
        }
        const parsedBlanks: Record<string, ClozeBlankResponse> = {};
        for (const [blankId, blankValue] of Object.entries(blanks)) {
            const parsedBlank = parseBlankResponse(blankValue);
            if (!parsedBlank) {
                return { error: `Invalid response for blank ${blankId}` };
            }
            parsedBlanks[blankId] = parsedBlank;
        }
        parsedLines.push({ lineIndex, blanks: parsedBlanks });
    }

    return { fieldsetQid, lines: parsedLines };
}

export const POST: RequestHandler = async ({ cookies, request }) => {
    const { expState, valid } = await verifyStateCookie(cookies);
    if (!expState) {
        return json({ error: "No experiment state" }, { status: 401 });
    }
    if (!valid) {
        return json({ error: "Invalid experiment state" }, { status: 401 });
    }

    const sessionId = expState.session.sessionId;
    if (!sessionId) {
        return json({ error: "No session ID" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = parseBody(body);
    if ("error" in parsed) {
        return json({ error: parsed.error }, { status: 400 });
    }

    const participantKey = participantRandomizationKey(expState);
    const { data, error } = await submitClozeFieldset(
        sessionId,
        participantKey,
        parsed.fieldsetQid,
        parsed.lines,
    );

    if (error) {
        const status = error.code === "404" ? 404 : error.code === "400" ? 400 : 500;
        return json(
            {
                error: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            },
            { status },
        );
    }

    return json({ data });
};
