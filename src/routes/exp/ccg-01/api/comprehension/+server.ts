import type { MultipleChoiceItem } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import {
    type StoredItems,
    submitComprehensionQuestion,
} from "$exp/ccg-01/_database/ComprehensionQuestionServer.ts";
import { setStateCookie, verifyStateCookie } from "$exp/ccg-01/_state/Cookie.ts";
import { json, type RequestHandler } from "@sveltejs/kit";

function parseBody(
    body: unknown,
): { qid: string; storedItems: StoredItems } | { error: string } {
    if (!body || typeof body !== "object") {
        return { error: "Invalid request body" };
    }

    const { qid, canonicalItems, userItems } = body as Record<string, unknown>;

    if (typeof qid !== "string" || !qid) {
        return { error: "qid is required" };
    }
    if (!Array.isArray(canonicalItems)) {
        return { error: "canonicalItems must be an array" };
    }
    if (userItems !== undefined && !Array.isArray(userItems)) {
        return { error: "userItems must be an array when provided" };
    }

    return {
        qid,
        storedItems: {
            canonicalItems: canonicalItems as MultipleChoiceItem[],
            userItems: userItems as MultipleChoiceItem[] | undefined,
        },
    };
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

    const { qid, storedItems } = parsed;
    const { data, error } = await submitComprehensionQuestion(sessionId, qid, storedItems);

    if (error) {
        const status = error.code === "404" ? 404 : 500;
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
