# Design - MultipleChoiceQuestion

## Notes

I started v2 of this component intending to follow the patterns of RangeSet v3. However, the
inclusion of potential correctness (`isTrue`) introduces additional complexity into checking if the
question has been completed (it's no longer enough to confirm that some value exists; rather,
specific states must be either true or false). Additionally, interaction history is recorded in
`wasSelected`. This suggests that a different architecture might be better-suited to this problem,
especially since these states can be `$derived()`.

Here's a description of the MultipleChoiceQuestion component:

## Interfaces

```ts
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
export interface MultipleChoiceQuestion {
    qid: string; // Identifies the question
    questionText: string; // This is the fieldset's legend text
    items: MultipleChoiceItem[]; // Array of response items
    inputType: "radio" | "checkbox"; // Having one component with inputType options prevents Svelte's two-way binding (since inputType must be known at the component's compile time), but we can use onchange instead.
    required?: "none" | "any" | "all"; // none: the question is always compelte; responding is optional. any: the question is complete if any response item is currently selected. all: the question is complete if all "true" response items are currently selected && no "false" response items are currently selected. If "all", then feedback colors will be shown.
    randSeed?: string; // Seed for randomization of display order; allows deterministic randomization.
    allowReset?: boolean; // If true, then the component includes a button to reset the question state.
    allowUserItems?: boolean; // If true, then the user can add additional response items.
}
```

## Open questions:

- Completion logic should live somewhere with the child component rather than needing the parent
  component to figure it out all on its own. What's the best way to do this?

- Completion state can be `$derived()`, but would using a `state` field on `MultipleChoiceQuestion`
  be easier?

- Would using a full class make this simpler or more idiomatic? Checking completion could then be a
  method on the class.

- What's the best way to bind the `MultipleChoiceQuestion` object to between parent and child?
  RangeSet v3 has props that don't change and binds an array of inputValues, but the inputValues are
  simply a `Record<string, number | null>`. This would require binding a larger option, at which
  point I might be completely duplicating the question object, which seems like not the best
  solution.
