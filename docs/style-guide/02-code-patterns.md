# Part 2: Code patterns

## 1. Principles

In priority order:

1. **Correct.** The participant's data is recorded once and recorded accurately.
2. **Simple.** Use the least machinery that solves the problem. Prefer a function to a class, a
   plain object to a class instance, `$derived` to `$effect`, and an inline expression to a helper
   used once.
3. **Fast.** Do work once, where it is cheapest: on the server at load, at build time, or in the
   background. Do not trade simplicity for speed without a measured reason.

The v4 question types (`lib/common/QuestionTypes/*/v4/`) and `lib/exp/games/ccg/v3/` show these
principles applied. Earlier versions (e.g. `Feedback/v3/model.svelte.ts`) used classes for the same
job. The project moved away from that approach deliberately.

## 2. Data: plain objects

Any data that crosses a boundary is a plain object described by an `interface`. Boundaries:
server → client (`load`, actions), client → localStorage, client → database, client → API.

Plain objects serialize through `devalue`, `JSON`, and `structuredClone` without loss. Svelte's
`$state` proxies them deeply. Class instances lose their prototype at every one of these
boundaries.

```ts
export interface RangeSetQuestion {
    qid: string;
    questionText: string;
    min: number;
    max: number;
    step: number;
    required?: "none" | "any" | "all" | undefined;
    canonicalItems: RangeSetItem[];
    userItems?: RangeSetItem[] | undefined;
}
```

Rules:

- Use string-literal unions for closed sets (`"radio" | "checkbox"`), not `string`.
- Write optional fields as `field?: T | undefined`.
- Document a field with a trailing `//` comment only when its name does not explain it.
- Use `type` for unions of shapes (`ClozePageItem`); use `interface` for object shapes.

## 3. Behavior: model modules

Each data type has one **model module**, `<Name>.ts`, next to its component. It exports the
interface and free functions over it. It imports nothing from Svelte except types.

| Kind           | Signature                                                    | Example                                  |
| -------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Factory        | `new<Name>(canonical, stored?) => <Name>`                     | `newRangeSetQuestion(template, stored)`  |
| Query          | `(model, …) => value`. No mutation.                          | `isQuestionComplete(question)`           |
| Command        | `(model, …) => void`. Mutates `model` in place.               | `selectItem(question, itemId, true)`     |

Rules:

- **A function either returns a value or mutates its argument. Never both.** Commands return
  `void`. A function that returns a new object must not modify its inputs.
- **Factories return fresh objects.** Copy nested arrays and objects from templates
  (`items.map((item) => ({ ...item }))`) so state never aliases a module-level constant.
- **Commands mutate in place.** The model is usually a `$state` proxy, so in-place mutation is what
  makes Svelte update. Returning a copy forces a reassignment and re-renders the whole tree.
- **Commands validate and no-op.** `addUserItem` returns early if `allowUserItems` is false or the
  ID exists. Callers do not pre-check.
- Keep model functions pure apart from argument mutation: no localStorage, no network, no `Date.now()`
  unless time is the point (`submitRound` takes `elapsedSeconds` as an argument).

## 4. Components

### Props contract for instruments

```ts
let {
    question = $bindable<MultipleChoiceQuestion>(),
    save,
    sync,
}: {
    question: MultipleChoiceQuestion;
    save?: (question: MultipleChoiceQuestion) => void;
    sync?: (question: MultipleChoiceQuestion) => void;
} = $props();
```

- One bindable model prop. The parent owns the model; the component edits it through commands.
- `save` runs after every change. It is cheap and synchronous (localStorage).
- `sync` runs at checkpoints: completion, deletion, every _N_ rounds. It only enqueues.
- Both are optional. Without them the component works as a demo (`DemoGame.svelte`).
- A `lib/` component never imports a DBM, `SyncHandler`, `expState`, or anything from `#exp/*`.

### Event handlers

Name handlers `handle<Event>`. A handler calls one or more commands, then `save`, then `sync` when
a checkpoint is reached:

```ts
function handleSelectItem(itemId: string, isSelected: boolean) {
    selectItem(question, itemId, isSelected);
    save?.(question);
    if (isQuestionComplete(question)) sync?.(question);
}
```

### Local UI state

UI-only state (an open dialog, a text input draft) is `$state` inside the component. It never goes
into the model. Per-item UI state uses a template-level declaration inside the `{#each}` or `{#if}`
block:

```svelte
{#if question.allowUserItems}
    {let userItemInput = $state("")}
    …
{/if}
```

For a non-reactive per-item constant use `{const x = …}`; for a reactive one use
`{const x = $derived(…)}`. Use this form rather than `{@const}` in new code, so one syntax covers
both cases.

### Styles

Scoped `<style>` per component. Colors use `oklch()` and `light-dark()`. Experiment-wide defaults go
in `experiment.css` inside `@layer experiment-defaults`. Do not use inline `style=""` except for
values computed at runtime.

## 5. Runes

| Need                                                       | Use                                    |
| ---------------------------------------------------------- | -------------------------------------- |
| A value computed from other state                           | `$derived` / `$derived.by`             |
| A side effect outside Svelte (network, timer, DOM API)      | `$effect`, returning a cleanup         |
| A DOM call when an element mounts                           | `{@attach}` on the element             |
| Initial state from a prop, intentionally not tracked        | `$state(untrack(() => prop))`          |

Rules:

- An `$effect` never writes state it reads.
- Every `$effect` that starts a timer, interval, or async loop returns a cleanup that stops it
  (see `end/+page.svelte`: `cancelled` flag + `clearTimeout`).
- Do not silence `state_referenced_locally` with `svelte-ignore`. Either derive the value, or
  capture the initial value explicitly with `untrack` and a comment saying why.
- Destructure `data` with `$derived`: `const { questions } = $derived(data);`.

## 6. Classes

Use a class only when all of these hold:

1. It runs only on the client.
2. One long-lived instance exists per layout (it has identity).
3. It owns private mutable state that callers must not touch directly.

Current classes: `SyncHandler` (queue + timers), `Debugger` (namespace tree). Nothing else
qualifies.

Rules:

- Provide the instance with a context pair exported next to the class:
  `export const [getSyncHandler, setSyncHandler] = createContext<SyncHandler>();`
- Use `#private` fields for internal state and `readonly` for identity fields.
- Use `$state` fields only when the UI renders them. Put such a class in a `.svelte.ts` file.
  A class without runes stays in `.ts` (`SyncHandler.ts`).
- A class instance is never returned from `load`, stored in localStorage, sent to an API, or passed
  to a `lib/` component as model data.

## 7. Server code

- `load` and actions are thin: verify the cookie, call plain functions, set the cookie, return plain
  data.
- Mutating actions call `validateStateCookieOrRedirect`. Read-only loads use `parent()`.
- Parse untrusted input field by field and return a typed result or `{ error }`. Do not cast
  `request.json()` to a type.
- Across module boundaries return `{ data, error }`. Throw only to abort a request
  (`redirect`, `error`).
- **Check `error` before `data`.** Otherwise a database error is reported as "no data".
- Log with `getLogger({ mod })`, where `mod` is the path from `src/routes/` or `src/lib/` without
  the extension (`exp/ccg-01/_state/Cookie`). Pass objects first: `log.warn({ claims }, "message")`.
- Client debugging uses `getDebugger().extend("<name>").debug`. Do not create a `debug` you do not
  call.

## 8. Versioning

Full rules, including enforcement: Part 4. In short:

- Every module under `lib/common/` and `lib/exp/` lives in `<Name>/v<MAJOR>/`. The import path
  pins the major.
- The full semantic version is the top entry of the folder's `CHANGELOG.md`.
- Any change participants can see, any changed default, and any change to a signature or data
  shape is **major**: create `v<N+1>`. Off-by-default additions are **minor**; defect fixes are
  **patch**. Both stay in the same folder, with a version bump.
- New majors start as `<N>.0.0-dev` and may change freely until an experiment that uses them is
  frozen.
- An experiment imports exactly one major of each module.
- Delete a major once nothing imports it. (Superseded versions account for most of the current
  `bun run check` errors.)

## 9. Files, imports, naming

| Item                       | Convention                                                       | Example                                   |
| -------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Component                  | `PascalCase.svelte`                                              | `RangeSetQuestion.svelte`                 |
| Model module               | Same name as its component, `.ts`                               | `RangeSetQuestion.ts`                     |
| Rune module                | `.svelte.ts` only if it uses runes                               | `Debugger.svelte.ts`                      |
| DBM                        | `<Instrument>DBM.ts`                                             | `FeedbackDBM.ts`                          |
| Constants                  | `UPPER_SNAKE_CASE`                                               | `ACTIVITY_EXPIRATION_LIMIT`               |
| Database fields in payloads| `snake_case`, matching the column                                | `session_id`, `question_text`             |
| IDs in content (`qid`, `itemId`) | lowercase, hyphenated, prefixed by area                     | `survey-gender-norms`, `cq:gd1:earning-points` |

Imports:

- Use `#lib/…` and `#exp/…` with the `.ts` extension. Use `./` only for a sibling file.
  No `../`.
- Inside `.svelte` scripts, place imports in the section that uses them (Part 1, §5).

Formatting: 4-space indent, double quotes, trailing commas, ~100-column lines.

## 10. Performance

- **Do work at the cheapest point.** Shuffle and build question data in `load`, seeded per
  participant. Parse static content at build time (`bun run build:cloze`).
- **Keep stored shapes minimal.** `save` runs on every input. Store IDs and participant-produced
  fields only.
- **Batch writes.** `shouldSync(session, 4)` syncs game rounds every four rounds and at completion.
- **Never block navigation on the network.** `sync` only enqueues; `SyncHandler` retries with
  exponential backoff.
- **Preload the next page's code** (`NavigationBarWrapper` → `codePreloadPath`).
- Prefer a keyed `{#each items as item (item.id)}`.

## Known deviations

| ID  | Deviation                                                                                                              | Fix                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| C1  | `RangeSetQuestionDBM.submit` and `PageTimeTrackerDBM.submit` check `!data` before `error`, which hides the real error.  | Check `error` first.                                                |
| C2  | `PageTimeTracker/v2` `flushActivePage` both mutates `record` and returns it.                                           | Return `void` (command) in the next version.                        |
| C3  | `MultipleChoiceQuestion/v4` exports `MultipleChoiceQuestion(data)`, an identity function with a commented-out body.    | Remove; call sites need no wrapper.                                 |
| C4  | `resolveDisplayOrder` and `shuffleSameDisplayIndexGroups` are duplicated in MCQ v4 and RangeSet v4. `clientsideSanitize` and `normalizeItemId` too. | Move to `lib/common/Randomization/` and a shared text util in the next version of either. |
| C5  | `newMultipleChoiceQuestion` re-runs `resolveDisplayOrder` on the client after `load` already did.                     | Resolve once, in `load`.                                            |
| C6  | `FeedbackWrapper.svelte` uses three `svelte-ignore state_referenced_locally`. Three pages trigger the same warning.     | `untrack` with a comment, or derive.                                |
| C7  | `Feedback/v4` opens the dialog via `$effect`.                                                                           | `{@attach (el) => el.showModal()}` on the `<dialog>`.               |
| C8  | Both `{const}` (22) and `{@const}` (36) appear in templates.                                                           | `{const}` in new code.                                              |
| C9  | Model-module names vary: `MultipleChoiceQuestion.ts`, `clozeQuestion.ts`, `gameState.ts`.                             | Same name as the component in new versions.                        |
| C10 | `survey/+page.svelte` imports `.js` paths; 19 files under `routes/exp` use `../` imports.                              | `#exp/…/*.ts`.                                                       |
| C11 | Logger `mod` values use four different formats.                                                                        | §7 format.                                                          |
| C12 | Most pages declare `const debug` and never call it. `_state/Client.ts`, `Pages.ts`, `Feedback/v4` use `debugLib` directly. | §7.                                                                |
| C13 | `ExperimentState.session.role` is `string`; role names are repeated as string literals in several files.               | `type Role = "participant" \| "over-quota" \| …` in `ExperimentState.ts`. |
| C14 | `+layout.server.ts` annotates `Boolean` (the wrapper type).                                                            | `boolean`.                                                          |
