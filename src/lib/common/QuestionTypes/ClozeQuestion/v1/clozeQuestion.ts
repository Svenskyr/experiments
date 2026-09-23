import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";
import { parseClozeQuestion } from "./parser.ts";

export interface ClozeQuestionSource {
    qid: string;
    label: string;
    content: string | string[];
    /** undefined: no shuffle; null: shuffle unseeded; "" filled at load with participant key + qid */
    randomize?: string | number | null | undefined;
}

/*
exampleCloze:ClozeQuestionSource = {
    qid: "questionId",
    label: "Example cloze",
    content: "This is a cloze-type question with modal options [blankId: *[correct choice], [other choice 1], [other choice 2], []] option.", // or string[] — one parsed line per array element
    randomize: 12345, // null: randomize without seed; undefined: no randomization. Per-blank shuffle uses question seed + blank id + blank index.
}
*/

export type ClozeContentNode = TextNode | BlankNode;

export interface TextNode {
    type: "text";
    text: string;
}

export interface BlankNode {
    type: "blank";
    blankId: string;
    blankIndex: number;
    blankOptions: ResponseItem[];
}

export interface ResponseItem {
    itemId: string;
    itemLabel: string | undefined; // undefined: user provides text input
    isTrue?: boolean | undefined;
    sourceIndex: number;
}

export interface ClozeQuestionIR {
    qid: string;
    label: string;
    lines: readonly (readonly ClozeContentNode[])[];
    randomize?: string | number | null | undefined;
}

export type ClozeBlankResponse = {
    selectedItemId: string;
    freeText: string;
};

export function getBlanksFromQuestion(question: ClozeQuestionIR): BlankNode[] {
    const blanks: BlankNode[] = [];
    for (const line of question.lines) {
        for (const node of line) {
            if (node.type === "blank") {
                blanks.push(node);
            }
        }
    }
    return blanks;
}

export function blankHasCorrectMarker(blank: BlankNode): boolean {
    return blank.blankOptions.some((item) => item.isTrue === true);
}

export function questionHasCheckableAnswers(question: ClozeQuestionIR): boolean {
    return getBlanksFromQuestion(question).some(blankHasCorrectMarker);
}

export function isBlankAnswered(blank: BlankNode, response: ClozeBlankResponse): boolean {
    const choices = blank.blankOptions.filter((item) => item.itemLabel !== undefined);
    const free = blank.blankOptions.find((item) => item.itemLabel === undefined);
    if (choices.length > 0) {
        if (!response.selectedItemId) {
            return false;
        }
        if (free && response.selectedItemId === free.itemId) {
            return response.freeText.trim().length > 0;
        }
        return true;
    }
    if (free) {
        return response.freeText.trim().length > 0;
    }
    return false;
}

export function isBlankCorrect(blank: BlankNode, response: ClozeBlankResponse): boolean {
    const item = blank.blankOptions.find((option) => option.itemId === response.selectedItemId);
    if (!item || item.isTrue !== true) {
        return false;
    }
    if (item.itemLabel === undefined) {
        return response.freeText.trim().length > 0;
    }
    return true;
}

export function resolveClozeRandomizeSeed(
    source: Pick<ClozeQuestionSource, "qid" | "randomize">,
    participantKey: string,
): string | number | null | undefined {
    const { randomize, qid } = source;
    if (randomize === undefined) {
        return undefined;
    }
    if (randomize === null) {
        return null;
    }
    if (randomize === "") {
        return `${participantKey}-${qid}`;
    }
    return randomize;
}

/** Fisher–Yates seed for one blank; distinct per blank within a question. */
export function clozeBlankShuffleSeed(
    questionRandomize: string | number,
    blank: Pick<BlankNode, "blankId" | "blankIndex">,
): string {
    return `${questionRandomize}:${blank.blankId}:${blank.blankIndex}`;
}

export function applyClozeRandomization(question: ClozeQuestionIR): ClozeQuestionIR {
    if (question.randomize === undefined) {
        return question;
    }

    const lines = question.lines.map((line) =>
        line.map((node) => {
            if (node.type !== "blank") {
                return node;
            }
            const seed = question.randomize === null
                ? undefined
                : clozeBlankShuffleSeed(question.randomize, node);
            return {
                ...node,
                blankOptions: FisherYatesShuffle(node.blankOptions, seed),
            };
        })
    );

    return { ...question, lines };
}

export function buildClozeQuestion(
    source: ClozeQuestionSource,
    participantKey: string,
): ClozeQuestionIR {
    const randomize = resolveClozeRandomizeSeed(source, participantKey);
    const parsed = parseClozeQuestion({ ...source, randomize });
    return applyClozeRandomization(parsed);
}
