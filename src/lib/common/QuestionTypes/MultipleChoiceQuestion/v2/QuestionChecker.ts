import type { MultipleChoiceQuestion } from "./MultipleChoiceQuestion.ts";

// trueResponses can technically be derived from props, but I'm not sure how that affects references.
// const trueResponses = $derived(questionObject?.data.responses.filter((r) => r.isTrue));
// const selectedResponses = $derived(
//     questionObject?.data.responses.filter((r) => r.isSelected),
// );
// const everSelectedResponses = $derived(
//     questionObject?.data.responses.filter((r) => r.wasEverSelected),
// );
// const allCorrectAreSelected: boolean = $derived(
//     trueResponses?.every((r) => r.isSelected) ?? false,
// );
// const noIncorrectAreSelected: boolean = $derived(
//     selectedResponses?.every((r) => r.isTrue !== false) ?? true,
// );
// const questionIsComplete: boolean = $derived.by(() => {
//     if (!questionObject) return false;
//     if (!questionObject.data.required) return true;
//     if (!questionObject.data.showFeedback) return selectedResponses!.length >= 1;
//     return allCorrectAreSelected && noIncorrectAreSelected;
// });
