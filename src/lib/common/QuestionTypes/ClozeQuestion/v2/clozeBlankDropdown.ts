import type { BlankNode, ClozeBlankResponse, ResponseItem } from "../v1/clozeQuestion.ts";
import { clientsideSanitize } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";

/** Option is ruled out in the open list while this blank is graded. */
export function isDropdownOptionEliminated(
    _blank: BlankNode,
    item: ResponseItem,
    gradedResponse: ClozeBlankResponse | undefined,
): boolean {
    if (!gradedResponse) {
        return false;
    }
    if (item.isTrue === true) {
        return false;
    }
    const tried = new Set(gradedResponse.wasSelectedItemIds ?? []);
    if (gradedResponse.selectedItemId) {
        tried.add(gradedResponse.selectedItemId);
    }
    return tried.has(item.itemId);
}

/** Plain text for sizer width (strips HTML). */
export function optionLabelText(label: string): string {
    const sanitized = clientsideSanitize(label);
    if (typeof document === "undefined") {
        return sanitized.replace(/<[^>]*>/g, "");
    }
    const el = document.createElement("div");
    el.innerHTML = sanitized;
    return el.textContent ?? "";
}

export function widestDropdownLabel(
    choices: ResponseItem[],
    hasFreeOption: boolean,
): string {
    const labels = choices.map((item) => optionLabelText(item.itemLabel!));
    if (hasFreeOption) {
        labels.push("Other…");
    }
    return labels.reduce((widest, label) => (label.length > widest.length ? label : widest), "");
}
