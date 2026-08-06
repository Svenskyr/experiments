/* Describes a complete multiple choice response item */
export interface MultipleChoiceItem {
    itemId: string; // Identifies the item within the question.
    itemText: string; // Text that the user sees (or enters if it's user-provided)
    isTrue?: boolean; // Whether the item is canonically correct or incorrect (e.g., "2 + 2...: a) 4, b) 5"). If undefined or null, then it doesn't have a truth state (e.g., which of these colors do you prefer? a) red, b) blue).
    displayOrder?: number; // Ordering hint provided as a prop. If undefined, then randomized with other undefined items.
    isSelected?: boolean; // The item is currently selected ("checked" in HTML).
    wasSelected?: boolean; // The item was ever selected (used for tracking incorrect selections).
}

/* Describes a somewhat client-safe multiple choice response item; used for storage, then hydrated by component */
export interface ClientStoredResponse {
    itemId: string;
    itemText: string;
    isSelected: boolean;
    wasSelected: boolean;
}

/* Describes a complete multiple choice question */
export interface MultipleChoiceQuestionInterface {
    qid: string; // Identifies the question
    questionText: string; // This is the fieldset's legend text
    items: MultipleChoiceItem[]; // Array of response items
    inputType: "radio" | "checkbox"; // Having one component with inputType options prevents Svelte's two-way binding (since inputType must be known at the component's compile time), but we can use onchange instead.
    required?: "none" | "any" | "all"; // none: the question is always compelte; responding is optional. any: the question is complete if any response item is currently selected. all: the question is complete if all "true" response items are currently selected && no "false" response items are currently selected. If "all", then feedback colors will be shown.
    randSeed?: string; // Seed for randomization of display order; allows deterministic randomization.
    allowReset?: boolean; // If true, then the component includes a button to reset the question state.
    allowUserItems?: boolean; // If true, then the user can add additional response items.
}
