<script lang="ts">
import type { BlankNode, ClozeBlankResponse, ResponseItem } from "../v1/clozeQuestion.ts";
import { clientsideSanitize } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { isDropdownOptionEliminated, widestDropdownLabel } from "./clozeBlankDropdown.ts";

let {
    blank,
    choices,
    freeOption = undefined,
    selectedItemId,
    disabled = false,
    gradedResponse = undefined,
    correct = false,
    incorrect = false,
    open = false,
    onOpenChange,
    onSelect,
}: {
    blank: BlankNode;
    choices: ResponseItem[];
    freeOption?: ResponseItem | undefined;
    selectedItemId: string;
    disabled?: boolean;
    gradedResponse?: ClozeBlankResponse | undefined;
    correct?: boolean;
    incorrect?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSelect: (itemId: string) => void;
} = $props();

const listboxId = `cloze-listbox-${blank.blankId}`;
const sizerLabel = $derived(widestDropdownLabel(choices, Boolean(freeOption)));

const selectedChoice = $derived(
    choices.find((item) => item.itemId === selectedItemId),
);

function setOpen(next: boolean): void {
    onOpenChange?.(next);
}

let rootElement: HTMLSpanElement | undefined = $state(undefined);

$effect(() => {
    if (!open) {
        return;
    }

    function handleDocumentPointerDown(event: PointerEvent): void {
        const root = rootElement;
        if (!root) {
            return;
        }
        const target = event.target;
        if (target instanceof Node && root.contains(target)) {
            return;
        }
        setOpen(false);
    }

    function handleDocumentKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            setOpen(false);
        }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
        document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
        document.removeEventListener("keydown", handleDocumentKeyDown);
    };
});

function handleTriggerClick(): void {
    if (disabled) {
        return;
    }
    setOpen(!open);
}

function trySelect(item: ResponseItem): void {
    if (disabled) {
        return;
    }
    if (isDropdownOptionEliminated(blank, item, gradedResponse)) {
        return;
    }
    onSelect(item.itemId);
    setOpen(false);
}

function handleOptionKeyDown(event: KeyboardEvent, item: ResponseItem): void {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }
    event.preventDefault();
    trySelect(item);
}
</script>

<span class="cloze-dropdown-root" bind:this={rootElement}>
    <span class="cloze-select-wrap">
        <button
            type="button"
            class="cloze-select cloze-dropdown-trigger"
            class:correct
            class:incorrect
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-label={`Response for blank ${blank.blankId}`}
            {disabled}
            onclick={handleTriggerClick}
        >
            <span class="cloze-dropdown-trigger-label">
                {#if selectedChoice}
                    {@html clientsideSanitize(selectedChoice.itemLabel!)}
                {:else if freeOption && selectedItemId === freeOption.itemId}
                    Other…
                {:else}
                    <!-- In-flow text so inline baseline matches surrounding sentence (empty buttons use border-bottom baseline). -->
                    <span class="cloze-dropdown-empty-placeholder">{sizerLabel || "\u00a0"}</span>
                {/if}
            </span>
        </button>
        <span class="cloze-select-sizer" aria-hidden="true">{sizerLabel}</span>
    </span>
    {#if open && !disabled}
        <ul id={listboxId} class="cloze-dropdown-list" role="listbox" aria-label={`Options for blank ${blank.blankId}`}>
            {#each choices as item (item.itemId)}
                {@const eliminated = isDropdownOptionEliminated(blank, item, gradedResponse)}
                <li
                    role="option"
                    aria-selected={selectedItemId === item.itemId}
                    aria-disabled={eliminated}
                    class="cloze-dropdown-option"
                    class:eliminated
                    tabindex={eliminated ? -1 : 0}
                    onkeydown={(e) => handleOptionKeyDown(e, item)}
                    onclick={() => trySelect(item)}
                >
                    <span class="cloze-dropdown-option-label">
                        {@html clientsideSanitize(item.itemLabel!)}
                    </span>
                </li>
            {/each}
            {#if freeOption}
                {@const eliminated = isDropdownOptionEliminated(blank, freeOption, gradedResponse)}
                <li
                    role="option"
                    aria-selected={selectedItemId === freeOption.itemId}
                    aria-disabled={eliminated}
                    class="cloze-dropdown-option"
                    class:eliminated
                    tabindex={eliminated ? -1 : 0}
                    onkeydown={(e) => handleOptionKeyDown(e, freeOption)}
                    onclick={() => trySelect(freeOption)}
                >
                    Other…
                </li>
            {/if}
        </ul>
    {/if}
</span>

<style>
.cloze-dropdown-root {
    position: relative;
    display: inline-block;
    max-width: 100%;
    vertical-align: baseline;
}

.cloze-select-wrap {
    display: inline-grid;
    max-width: 100%;
    vertical-align: baseline;
}

.cloze-select-wrap > .cloze-select,
.cloze-select-wrap > .cloze-select-sizer {
    grid-area: 1 / 1;
    font: inherit;
    line-height: inherit;
}

.cloze-select-sizer {
    visibility: hidden;
    white-space: nowrap;
    box-sizing: border-box;
    padding-inline: 0.35rem 1.5rem;
    border: 1px solid transparent;
    pointer-events: none;
}

.cloze-select {
    width: 100%;
    min-width: 0;
    padding-inline: 0.35rem 1.5rem;
    font: inherit;
    box-sizing: border-box;
    border: 1px solid light-dark(oklch(70% 0 0), oklch(45% 0 0));
    border-radius: 0.35rem;
    appearance: none;
    background-color: light-dark(oklch(100% 0 0), oklch(20% 0 0));
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath fill='%236b7280' d='M0 0h10L5 6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.45rem center;
    background-size: 0.55rem auto;
    text-align: left;
    cursor: pointer;
}

.cloze-dropdown-trigger {
    display: block;
    margin: 0;
    padding-block: 0;
    line-height: inherit;
    vertical-align: baseline;
}

.cloze-dropdown-trigger:disabled {
    cursor: default;
}

.cloze-dropdown-trigger-label {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    min-height: 1lh;
}

.cloze-dropdown-empty-placeholder {
    visibility: hidden;
}

.cloze-select.correct {
    background-color: oklch(0.8 0.5 170);
    color: inherit;
    opacity: 1;
}

.cloze-select.correct:disabled {
    opacity: 1;
    color: black;
    -webkit-text-fill-color: currentColor;
}

.cloze-select.incorrect {
    background-color: oklch(0.7 0.2 20 / 1);
}

.cloze-dropdown-list {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 20;
    min-width: 100%;
    margin: 0.15rem 0 0;
    padding: 0.25rem 0;
    list-style: none;
    border: 1px solid light-dark(oklch(70% 0 0), oklch(45% 0 0));
    border-radius: 0.35rem;
    background-color: light-dark(oklch(100% 0 0), oklch(20% 0 0));
    box-shadow: 0 0.15rem 0.5rem light-dark(oklch(0% 0 0 / 0.12), oklch(0% 0 0 / 0.4));
}

.cloze-dropdown-option {
    padding: 0.35rem 0.5rem;
    cursor: pointer;
    user-select: none;
}

.cloze-dropdown-option:not(.eliminated):hover,
.cloze-dropdown-option:not(.eliminated):focus-visible {
    background-color: light-dark(oklch(0.8 0 0), oklch(0.4 0 0));
    outline: none;
}

.cloze-dropdown-option.eliminated {
    opacity: 0.5;
    text-decoration: line-through;
    pointer-events: none;
    cursor: default;
}

.cloze-dropdown-option-label {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
}
</style>
