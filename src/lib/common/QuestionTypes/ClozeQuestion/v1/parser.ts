import type {
    BlankNode,
    ClozeQuestionIR,
    ClozeQuestionSource,
    ResponseItem,
    TextNode,
} from "./clozeQuestion.ts";

export class ClozeParseError extends Error {
    readonly offset: number;
    readonly qid?: string;

    constructor(message: string, offset: number, qid?: string) {
        super(
            qid ? `${message} (qid: ${qid}, offset: ${offset})` : `${message} (offset: ${offset})`,
        );
        this.name = "ClozeParseError";
        this.offset = offset;
        this.qid = qid;
    }
}

const BLANK_ID_PATTERN = /^[A-Za-z0-9_-]+/;

type ParseContext = {
    content: string;
    qid?: string;
};

function fail(ctx: ParseContext, offset: number, message: string): never {
    throw new ClozeParseError(message, offset, ctx.qid);
}

function skipWhitespace(content: string, i: number): number {
    while (i < content.length && /\s/.test(content[i]!)) {
        i++;
    }
    return i;
}

function isBlankOpener(content: string, i: number): boolean {
    if (content[i] !== "[") {
        return false;
    }
    const afterBracket = content.slice(i + 1);
    const match = afterBracket.match(BLANK_ID_PATTERN);
    if (!match) {
        return false;
    }
    const rest = afterBracket.slice(match[0].length);
    return /^\s*:/.test(rest);
}

function readBlankId(content: string, i: number): { blankId: string; next: number } {
    const match = content.slice(i).match(BLANK_ID_PATTERN);
    if (!match || match[0].length === 0) {
        return { blankId: "", next: i };
    }
    return { blankId: match[0], next: i + match[0].length };
}

function parseOption(
    ctx: ParseContext,
    i: number,
    blankId: string,
    sourceIndex: number,
): { item: ResponseItem; next: number } {
    i = skipWhitespace(ctx.content, i);
    let isTrue: boolean | undefined;
    if (ctx.content[i] === "*") {
        isTrue = true;
        i++;
    }
    i = skipWhitespace(ctx.content, i);
    if (ctx.content[i] !== "[") {
        fail(ctx, i, "Expected '[' starting an option");
    }
    i++;
    if (ctx.content[i] === "]") {
        i++;
        const item: ResponseItem = {
            itemId: `${blankId}:${sourceIndex}`,
            itemLabel: undefined,
            sourceIndex,
            ...(isTrue ? { isTrue } : {}),
        };
        return { item, next: i };
    }
    const labelStart = i;
    while (i < ctx.content.length && ctx.content[i] !== "]") {
        i++;
    }
    if (i >= ctx.content.length) {
        fail(ctx, labelStart, "Unclosed option label ']'");
    }
    const itemLabel = ctx.content.slice(labelStart, i);
    i++;
    const item: ResponseItem = {
        itemId: `${blankId}:${sourceIndex}`,
        itemLabel,
        sourceIndex,
        ...(isTrue ? { isTrue } : {}),
    };
    return { item, next: i };
}

function parseBlank(
    ctx: ParseContext,
    startIndex: number,
    blankIndex: number,
): { node: BlankNode; next: number } {
    let i = startIndex;
    if (ctx.content[i] !== "[") {
        fail(ctx, i, "Expected '[' starting a blank");
    }
    i++;
    const { blankId, next: afterId } = readBlankId(ctx.content, i);
    if (!blankId) {
        fail(ctx, i, "Expected blank id after '['");
    }
    i = afterId;
    i = skipWhitespace(ctx.content, i);
    if (ctx.content[i] !== ":") {
        fail(ctx, i, "Expected ':' after blank id");
    }
    i++;
    const blankOptions: ResponseItem[] = [];
    let sourceIndex = 0;
    while (true) {
        i = skipWhitespace(ctx.content, i);
        if (ctx.content[i] === "]") {
            if (blankOptions.length === 0) {
                fail(ctx, i, "Blank must have at least one option");
            }
            i++;
            return {
                node: {
                    type: "blank",
                    blankId,
                    blankIndex,
                    blankOptions,
                },
                next: i,
            };
        }
        const { item, next } = parseOption(ctx, i, blankId, sourceIndex);
        blankOptions.push(item);
        sourceIndex++;
        i = skipWhitespace(ctx.content, next);
        if (ctx.content[i] === "]") {
            i++;
            return {
                node: {
                    type: "blank",
                    blankId,
                    blankIndex,
                    blankOptions,
                },
                next: i,
            };
        }
        if (ctx.content[i] !== ",") {
            fail(ctx, i, "Expected ',' or ']' between blank options");
        }
        i++;
    }
}

function coalesceTextNodes(nodes: (TextNode | BlankNode)[]): (TextNode | BlankNode)[] {
    const result: (TextNode | BlankNode)[] = [];
    for (const node of nodes) {
        if (node.type === "text") {
            const prev = result[result.length - 1];
            if (prev?.type === "text") {
                prev.text += node.text;
            } else {
                result.push({ ...node });
            }
        } else {
            result.push(node);
        }
    }
    return result;
}

type ParseState = {
    seenBlankIds: Set<string>;
    blankIndex: number;
};

function parseContent(ctx: ParseContext, state: ParseState): readonly (TextNode | BlankNode)[] {
    const nodes: (TextNode | BlankNode)[] = [];
    let i = 0;

    while (i < ctx.content.length) {
        if (ctx.content[i] === "[" && isBlankOpener(ctx.content, i)) {
            const { node, next } = parseBlank(ctx, i, state.blankIndex);
            if (state.seenBlankIds.has(node.blankId)) {
                fail(ctx, i, `Duplicate blank id "${node.blankId}"`);
            }
            state.seenBlankIds.add(node.blankId);
            nodes.push(node);
            state.blankIndex++;
            i = next;
            continue;
        }

        const textStart = i;
        while (i < ctx.content.length) {
            if (ctx.content[i] === "[" && isBlankOpener(ctx.content, i)) {
                break;
            }
            i++;
        }
        nodes.push({ type: "text", text: ctx.content.slice(textStart, i) });
    }

    return coalesceTextNodes(nodes);
}

function normalizeContentLines(content: string | string[]): string[] {
    return Array.isArray(content) ? content : [content];
}

/**
 * Parses `exampleCloze` from clozeQuestion.ts comment:
 * content includes `[blankId: *[correct choice], [other choice 1], [other choice 2], []]`
 * → one BlankNode with four ResponseItems; first has isTrue: true; last has itemLabel undefined.
 */
export function parseClozeQuestion(source: ClozeQuestionSource): ClozeQuestionIR {
    const label = source.label.trim();
    if (label.length === 0) {
        throw new ClozeParseError("Expected non-empty label", 0, source.qid);
    }

    const contentLines = normalizeContentLines(source.content);
    if (contentLines.length === 0) {
        throw new ClozeParseError("Expected at least one content line", 0, source.qid);
    }

    const state: ParseState = { seenBlankIds: new Set(), blankIndex: 0 };
    const lines = contentLines.map((line) => {
        const ctx: ParseContext = { content: line, qid: source.qid };
        return parseContent(ctx, state);
    });

    return {
        qid: source.qid,
        label,
        lines,
        randomize: source.randomize,
    };
}
