import type { MultipleChoiceItem } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { clientsideSanitize } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { maxPossibleMcqScore, processMcqResponses } from "./McqComprehensionQuestionServer.ts";
import {
    blankHasCorrectMarker,
    type BlankNode,
    buildClozeQuestion,
    type ClozeBlankResponse,
    type ClozeContentNode,
    type ClozeQuestionIR,
    type ClozeQuestionSource,
    getBlanksFromLine,
    isBlankCorrect,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import { clozeQuestionSources as gd1ClozeSources } from "../(pages)/game_description_1/clozeSource.ts";
import {
    buildOutcomePointsCloze,
    getOutcomePointsContentLines,
    OUTCOME_POINTS_CLOZE_QID,
} from "../(pages)/game_description_1/outcomePointsCloze.ts";
import { clozeQuestionSources as gd2ClozeSources } from "../(pages)/game_description_2/clozeSource.ts";

export type ClozeLinePayload =
    import("$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts").ClozeLineCheckPayload;

export interface ClozeLineResult {
    subQid: string;
    lineIndex: number;
    score: number;
    responses: MultipleChoiceItem[][];
    blankIds: string[];
    blankCorrect: Record<string, boolean>;
}

const staticClozeSources: ClozeQuestionSource[] = [...gd1ClozeSources, ...gd2ClozeSources];

function normalizeContentLines(content: string | string[]): string[] {
    return Array.isArray(content) ? content : [content];
}

export function clozeSubQid(baseQid: string, lineIndex0: number): string {
    return `${baseQid}-${lineIndex0 + 1}`;
}

export function parseClozeSubQid(
    subQid: string,
): { baseQid: string; lineNumber: number } | null {
    const match = subQid.match(/^(.+)-(\d+)$/);
    if (!match) {
        return null;
    }
    const lineNumber = Number.parseInt(match[2]!, 10);
    if (!Number.isFinite(lineNumber) || lineNumber < 1) {
        return null;
    }
    return { baseQid: match[1]!, lineNumber };
}

export function contentLinesForFieldset(fieldsetQid: string, participantKey: string): string[] {
    if (fieldsetQid === OUTCOME_POINTS_CLOZE_QID) {
        return getOutcomePointsContentLines(participantKey);
    }
    const source = staticClozeSources.find((entry) => entry.qid === fieldsetQid);
    if (!source) {
        throw new Error(`Unknown cloze fieldset qid: ${fieldsetQid}`);
    }
    return normalizeContentLines(source.content);
}

export function buildClozeFieldsets(participantKey: string): ClozeQuestionIR[] {
    const standard = staticClozeSources.map((source) => buildClozeQuestion(source, participantKey));
    const { question: outcomePoints } = buildOutcomePointsCloze(participantKey);
    return [...standard, outcomePoints];
}

export function getFieldsetIr(
    participantKey: string,
    fieldsetQid: string,
): ClozeQuestionIR | null {
    return buildClozeFieldsets(participantKey).find((question) => question.qid === fieldsetQid)
        ?? null;
}

export function mergeMcqBlankItems(
    current: MultipleChoiceItem[],
    previous: MultipleChoiceItem[] | undefined,
): MultipleChoiceItem[] {
    if (!previous?.length) {
        return current;
    }
    const prevById = new Map(previous.map((item) => [item.itemId, item]));
    return current.map((item) => {
        const prev = prevById.get(item.itemId);
        return {
            ...item,
            wasSelected: Boolean(item.wasSelected || prev?.wasSelected),
        };
    });
}

export function blankResponsesToMcqItems(
    blank: BlankNode,
    response: ClozeBlankResponse,
): MultipleChoiceItem[] {
    const history = new Set(response.wasSelectedItemIds ?? []);
    if (response.selectedItemId) {
        history.add(response.selectedItemId);
    }
    return blank.blankOptions.map((option, displayOrder) => {
        const selected = response.selectedItemId === option.itemId;
        let itemText = option.itemLabel !== undefined ? clientsideSanitize(option.itemLabel) : "";
        if (option.itemLabel === undefined && selected) {
            itemText = clientsideSanitize(response.freeText);
        }
        return {
            itemId: option.itemId,
            itemText,
            isTrue: option.isTrue,
            displayOrder,
            isSelected: selected,
            wasSelected: history.has(option.itemId),
        };
    });
}

export function scoreLine(
    lineNodes: readonly ClozeContentNode[],
    blankResponses: Record<string, ClozeBlankResponse>,
    previousResponses?: MultipleChoiceItem[][],
): {
    responses: MultipleChoiceItem[][];
    score: number;
    maxPossibleScore: number;
    blankCorrect: Record<string, boolean>;
    blankIds: string[];
} {
    const blanks = getBlanksFromLine(lineNodes);
    let responses = blanks.map((blank) =>
        blankResponsesToMcqItems(
            blank,
            blankResponses[blank.blankId] ?? { selectedItemId: "", freeText: "" },
        )
    );

    if (previousResponses) {
        responses = responses.map((items, index) =>
            mergeMcqBlankItems(items, previousResponses[index])
        );
    }

    const checkable = blanks.filter(blankHasCorrectMarker);
    const blankCorrect: Record<string, boolean> = {};
    for (const blank of checkable) {
        const response = blankResponses[blank.blankId] ?? { selectedItemId: "", freeText: "" };
        blankCorrect[blank.blankId] = isBlankCorrect(blank, response);
    }

    const flatItems = responses.flat();
    const { score } = processMcqResponses(flatItems);
    const templateMax = maxPossibleMcqScore(flatItems);
    const maxPossibleScore = checkable.length === 0 ? 1 : templateMax;
    const lineFullyCorrect = checkable.every((blank) => blankCorrect[blank.blankId]);
    const rawEarnedScore = flatItems.some((item) => item.wasSelected)
        ? score
        : checkable.length === 0
        ? 1
        : 0;
    const earnedScore = lineFullyCorrect ? rawEarnedScore : 0;

    return {
        responses,
        score: earnedScore,
        maxPossibleScore,
        blankCorrect,
        blankIds: blanks.map((blank) => blank.blankId),
    };
}

export function resolveLine(
    subQid: string,
    participantKey: string,
): {
    baseQid: string;
    lineIndex: number;
    lineNodes: readonly ClozeContentNode[];
    questionText: string;
} | null {
    const parsed = parseClozeSubQid(subQid);
    if (!parsed) {
        return null;
    }
    const fieldset = getFieldsetIr(participantKey, parsed.baseQid);
    if (!fieldset) {
        return null;
    }
    const lineIndex = parsed.lineNumber - 1;
    const lineNodes = fieldset.lines[lineIndex];
    if (!lineNodes) {
        return null;
    }
    const contentLines = contentLinesForFieldset(parsed.baseQid, participantKey);
    const questionText = contentLines[lineIndex];
    if (questionText === undefined) {
        return null;
    }
    return {
        baseQid: parsed.baseQid,
        lineIndex,
        lineNodes,
        questionText,
    };
}

export function allSubQids(participantKey: string): string[] {
    const subQids: string[] = [];
    for (const fieldset of buildClozeFieldsets(participantKey)) {
        for (let lineIndex = 0; lineIndex < fieldset.lines.length; lineIndex++) {
            subQids.push(clozeSubQid(fieldset.qid, lineIndex));
        }
    }
    return subQids;
}

export function allFieldsetQids(): string[] {
    return [...staticClozeSources.map((source) => source.qid), OUTCOME_POINTS_CLOZE_QID];
}

export {
    buildCheckLinesPayload,
    lineIndexForBlank,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
