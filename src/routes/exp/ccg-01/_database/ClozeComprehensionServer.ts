import type { ClozeBlankResponse } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import { getBlanksFromLine } from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import type { MultipleChoiceItem } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { supabase } from "../_database/ServiceRole.ts";
import type { PostgrestError } from "../_syncHandler/v3/SyncHandlerActions.ts";
import {
    type ClozeLinePayload,
    type ClozeLineResult,
    clozeSubQid,
    contentLinesForFieldset,
    getFieldsetIr,
    scoreLine,
} from "./ClozeComprehensionRegistry.ts";

export type { ClozeLinePayload, ClozeLineResult } from "./ClozeComprehensionRegistry.ts";

export async function submitClozeFieldset(
    sessionId: string,
    participantKey: string,
    fieldsetQid: string,
    linesPayload: ClozeLinePayload[],
): Promise<{ data: { lines: ClozeLineResult[] } | null; error: PostgrestError | null }> {
    const fieldset = getFieldsetIr(participantKey, fieldsetQid);
    if (!fieldset) {
        return {
            data: null,
            error: {
                message: `Unknown fieldset qid: ${fieldsetQid}`,
                details: "",
                hint: "",
                code: "404",
            },
        };
    }

    if (linesPayload.length === 0) {
        return {
            data: null,
            error: {
                message: "At least one line is required",
                details: "",
                hint: "",
                code: "400",
            },
        };
    }

    const results: ClozeLineResult[] = [];

    for (const linePayload of linesPayload) {
        const { lineIndex, blanks } = linePayload;
        const lineNodes = fieldset.lines[lineIndex];
        if (!lineNodes) {
            return {
                data: null,
                error: {
                    message: `Invalid lineIndex ${lineIndex} for ${fieldsetQid}`,
                    details: "",
                    hint: "",
                    code: "400",
                },
            };
        }

        const templateBlanks = getBlanksFromLine(lineNodes);
        for (const blank of templateBlanks) {
            if (!(blank.blankId in blanks)) {
                return {
                    data: null,
                    error: {
                        message: `Missing blank ${blank.blankId} for line ${lineIndex}`,
                        details: "",
                        hint: "",
                        code: "400",
                    },
                };
            }
        }
        for (const blankId of Object.keys(blanks)) {
            if (!templateBlanks.some((blank) => blank.blankId === blankId)) {
                return {
                    data: null,
                    error: {
                        message: `Unknown blank ${blankId} for line ${lineIndex}`,
                        details: "",
                        hint: "",
                        code: "400",
                    },
                };
            }
        }

        const subQid = clozeSubQid(fieldsetQid, lineIndex);

        const { data: existingRow } = await supabase
            .schema("exp_ccg_01")
            .from("comprehension")
            .select("responses")
            .eq("session_id", sessionId)
            .eq("qid", subQid)
            .maybeSingle();

        const previousResponses = Array.isArray(existingRow?.responses)
            ? existingRow.responses as MultipleChoiceItem[][]
            : undefined;

        const resolved = scoreLine(lineNodes, blanks, previousResponses);
        const questionText = contentLinesForFieldset(fieldsetQid, participantKey)[lineIndex] ?? "";

        const row = {
            session_id: sessionId,
            qid: subQid,
            question_text: questionText,
            responses: resolved.responses,
            score: resolved.score,
            max_possible_score: resolved.maxPossibleScore,
        };

        const { error } = await supabase
            .schema("exp_ccg_01")
            .from("comprehension")
            .upsert(row);

        if (error) {
            return {
                data: null,
                error: {
                    message: error.message,
                    details: error.details ?? "",
                    hint: error.hint ?? "",
                    code: error.code ?? "500",
                },
            };
        }

        results.push({
            subQid,
            lineIndex,
            score: resolved.score,
            responses: resolved.responses,
            blankIds: resolved.blankIds,
            blankCorrect: resolved.blankCorrect,
        });
    }

    return { data: { lines: results }, error: null };
}
