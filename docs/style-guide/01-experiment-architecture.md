# Part 1: Experiment architecture

## 1. Terms

| Term              | Meaning                                                                                      | ccg-01 value             |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------ |
| **Study ID**      | URL and folder name. Lowercase, hyphenated.                                                  | `ccg-01`                 |
| **Experiment ID** | Postgres schema name, `experiments.experiments` key, and localStorage prefix. Snake case.    | `exp_ccg_01`             |
| **Page**          | One step in the participant flow. One route under `(pages)/`. One entry in `PAGE_ORDER`.     | `survey`                 |
| **Instrument**    | Anything that produces participant data: a question, a game, feedback, a timer.             | `RangeSetQuestion`       |
| **DBM**           | Database module. Owns one instrument's storage key, local storage shape, and database write. | `RangeSetQuestionDBM.ts` |

## 2. Directory layout

```text
src/routes/exp/<study-id>/
  +layout.server.ts      # Verify state cookie; reconcile platform claims; return { expState, claims }
  +layout.svelte         # Create and provide Debugger, expState, SyncHandler; mount always-on wrappers
  +page.server.ts        # Gate: quota and platform verification
  +page.svelte           # Gate UI
  +error.svelte
  experiment.css         # Experiment-wide styles, inside @layer experiment-defaults
  freeze.json            # Present once live: pinned files, module versions, packages (Part 4)
  (pages)/
    +layout.server.ts    # Page ACL: redirect unless expState.pages[page].permitted
    [...rest]/+page.svelte  # Empty catch-all so unknown paths hit the ACL redirect
    <page>/
      +page.server.ts    # load: build question data. actions: requestNextPageCookie
      +page.svelte       # Bind instruments to DBMs; compute pageCompleted
      questions.ts       # Authored question data (canonical form)
      clozeSource.ts     # Authored cloze source (parsed at runtime or by build:cloze)
  _state/                # Cookie signing, ExperimentState, PAGE_ORDER, cookie helpers
  _database/             # One *DBM.ts per instrument; server-only modules (ServiceRole, Quota, …)
  _syncHandler/v<N>/     # Client sync queue and the Actions registry
  _components/           # Experiment-specific wrappers and configs
  api/                   # +server.ts endpoints for server-validated submissions
```

`_`-prefixed folders contain no `+` files. They are modules, not routes.

### Placement rule

Place code at the lowest level that is correct:

| The code…                                                         | Goes in                             |
| ----------------------------------------------------------------- | ----------------------------------- |
| …is used by one page only                                         | `(pages)/<page>/`                   |
| …knows about this experiment (expState, DBMs, SyncHandler, IDs)   | `routes/exp/<study-id>/_*/`         |
| …is a generic UI or data type with no experiment knowledge        | `lib/common/<Name>/v<N>/`           |
| …is shared across experiments but specific to experiment hosting  | `lib/exp/<area>/`                   |
| …runs only on the server and uses secrets or the service role     | a `*.server.ts` module (see D6)     |

A `lib/` module never imports from `#exp/*`.

## 3. State tiers

| Tier                                   | Holds                                            | Authority                       |
| -------------------------------------- | ------------------------------------------------ | ------------------------------- |
| Signed httpOnly cookie (`expState`)    | Identity, role, quota status, page permissions   | **Authoritative** for access    |
| localStorage (`<experiment_id>:*`)     | In-progress responses, sync queue, timings       | Draft only; never trusted        |
| Supabase                               | Submitted records                                 | Authoritative for data          |

Invariants:

1. The server holds no in-memory session state.
2. Only server code changes page permissions, and only through the signed cookie.
3. Client code reads `expState` through `getExpState()`. It merges server results with
   `Object.assign(expState, result.expState)`. It never computes permissions.
4. Every localStorage key starts with `<experiment_id>:`. `clearExperimentLocalStorage()` relies on
   this prefix.
5. Data that affects payment is validated on the server (`api/` + service role). Other data is
   written from the client under row-level security.

## 4. Request flow

```text
hooks.server.ts            locals.log, locals.supabase, locals.safeGetSession
routes/+layout(.server).ts browser/server Supabase client, session
exp/<id>/+layout.server.ts verify cookie → reconcile claims → maybe redirect to gate
exp/<id>/+layout.svelte    provide Debugger, expState, SyncHandler; initDb when sessionId exists
(pages)/+layout.server.ts  ACL redirect to maxPage() if page not permitted
<page>/+page.server.ts     load question data (seeded by participant key)
<page>/+page.svelte        render; on completion call requestNextPageCookie()
<page>/+page.server.ts     action requestNextPageCookie → setNextPageCookie(complete, grant, revoke)
```

## 5. Page anatomy

### `+page.server.ts`

- `load` returns plain data only. It builds question data from `questions.ts` or `clozeSource.ts`.
  Seed all randomization with `questionRandSeed(expState, qid)` or
  `participantRandomizationKey(expState)`, so a participant sees the same order on every load.
- `actions.requestNextPageCookie` declares the transition as three lists and calls
  `setNextPageCookie`:

  ```ts
  export const actions = {
      requestNextPageCookie: async ({ cookies }) => {
          const complete: PageName[] = ["survey"]; // Mark these pages completed
          const grant: PageName[] = ["end"]; // Allow access to these pages
          const revoke: PageName[] = []; // Remove access (e.g. no replaying the game)
          const { expState } = await setNextPageCookie(cookies, complete, grant, revoke);
          return { expState };
      },
  };
  ```

  Every page that advances the flow uses this action. Do not set page states by hand.

### `+page.svelte`

Order the `<script>` in labeled sections. Import each section's dependencies inside that section.

```svelte
<script lang="ts">
/* General */          // debugger, FeedbackWrapper, dev
/* expState */         // const expState = $derived(getExpState());
/* syncHandler */      // const syncHandler = getSyncHandler();
/* Page questions */   // DBM load/save/sync, model functions, components, $state for instruments
/* Page navigation */  // requestNextPageCookie, NavigationBarWrapper, pageCompleted, completion $effect
</script>
```

Completion rule: `pageCompleted` is a `$derived` boolean computed from model functions
(`isQuestionComplete`, `isGameComplete`). One `$effect` calls `requestNextPageCookie(expState)` when
it becomes true. `<NavigationBarWrapper {pageCompleted} />` renders the navigation.

Every content block gets a `<FeedbackWrapper page="<page>" label="<block>" />`.

Dev-only controls (skip, autofill) go inside `{#if dev}`.

## 6. Persisted instruments

### DBM contract

Each `_database/<Instrument>DBM.ts` exports exactly these, and nothing else that pages use:

| Export                           | Runs on | Does                                                                     |
| -------------------------------- | ------- | ------------------------------------------------------------------------ |
| `load(id)`                       | client  | Read the stored shape from localStorage, or `null`                       |
| `save(model)`                    | client  | Reduce the model to its stored shape; write localStorage                 |
| `sync(syncHandler, id)`          | client  | `syncHandler.enqueue(storageKey(id), "<actionName>")`                    |
| `submit(syncHandler, storageKey)`| client  | Rehydrate from storage + template; build the DB payload; write; `{ data, error }` |

Register `submit` in `_syncHandler/v<N>/SyncHandlerActions.ts` under the action name used by `sync`.

### Three shapes

Name these three shapes explicitly. They differ.

1. **Canonical:** authored in `questions.ts`. Complete, includes correct answers.
2. **Stored:** what `save` writes. Minimal: only participant-produced fields plus IDs.
3. **Payload:** what `submit` writes to the database. Derived from canonical + stored at submit time.

`submit` rehydrates from the canonical template plus the stored shape. It does not trust stored
copies of canonical fields such as question text or correctness.

### Wiring

`lib/` components know nothing about DBMs. The page, or a `_components/*Wrapper.svelte`, connects
them:

```svelte
<RangeSetQuestion
    {question}
    save={saveRangeSetData}
    sync={(question) => syncRangeSetData(syncHandler, question.qid)} />
```

Use a wrapper when the same wiring appears on more than one page (`FeedbackWrapper`,
`PageTimeTrackerWrapper`, `NavigationBarWrapper`).

### Server-validated instruments

If a response is graded or affects payment:

1. The client posts to `api/<area>/<kind>/+server.ts`.
2. The endpoint verifies the state cookie, then parses the body field by field (see
   `api/comprehension/cloze/+server.ts`: `parseBody`, `parseBlankResponse`).
3. A server module (`*Server.ts`) rebuilds the canonical question with the participant key, grades,
   and writes with the service role client.

## 7. Database

- One Postgres schema per experiment, named by the experiment ID. Shared tables live in
  `experiments`.
- Migration files: `<YYYYMMDD><NNN>_<schema>_<object-kind>_<name>.sql`, e.g.
  `20260713140_exp_ccg_01_table_survey.sql`. Superseding a function gets a new file named
  `…_replace_<function>.sql`. Never edit an applied migration.
- Each table migration states its `GRANT`s, enables row-level security, and defines its policies.
  Grant `authenticated` only the columns the client writes.

## 8. Checklists

### New page

1. Add the page name to `PAGE_ORDER` in `_state/Pages.ts`.
2. Create `(pages)/<page>/+page.svelte` and `+page.server.ts` with `requestNextPageCookie`.
3. In the previous page's action, add the new page to `grant`.
4. Add `FeedbackWrapper` per content block and `NavigationBarWrapper` at the end.

### New persisted instrument

1. If the UI is generic, build it in `lib/common/<Name>/v1/` (model `.ts` + `.svelte`) with a
   `CHANGELOG.md` at `1.0.0-dev`. See Parts 2 and 4.
2. Write `_database/<Name>DBM.ts` per §6.
3. Register `submit` in `SyncHandlerActions.ts`.
4. Add the table migration with grants and row-level security.
5. Wire it on the page with `save` and `sync`.

### New experiment

1. Choose the study ID (`xyz-01`) and experiment ID (`exp_xyz_01`).
2. Copy `src/routes/exp/ccg-01/` without its `(pages)/*` content and `_components/ColorCoordinationGame/`.
   Before copying, move `_state/` and `_syncHandler/` to `lib/exp/` (§9) and import them instead.
3. Replace every occurrence of the IDs, the cookie name, and the cookie path. (See deviation D1.)
4. Add `PRIVATE_<XYZ_01>_SECRET_KEY` to `src/env.ts` and the Worker secrets.
5. Set `PAGE_ORDER` and create the pages.
6. Add migrations: schema, `sessions` table, instrument tables, `experiments.experiments` row.
7. Reduce `SyncHandlerActions` to the instruments this experiment uses.
8. Link the experiment from `src/routes/(site)/`.
9. When it goes live: `bun run freeze <study-id>`, commit, tag `exp/<study-id>/live` (Part 4).

## 9. Shared infrastructure

`_state/` and `_syncHandler/` are generic except for constants. When a second experiment needs
them, move them to `lib/exp/<area>/v<N>/` and parameterize them by the experiment's constants
(D1). Do not copy them. Freezing (Part 4) keeps a live experiment pinned to the version it was
frozen with.

## Known deviations

| ID  | Deviation                                                                                                                                                                      | Fix                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| D1  | `"exp_ccg_01"` and `"/exp/ccg-01"` are hard-coded ~21 times each. `EXPERIMENT_ID` lives in `_database/Registration.ts`.                                                           | One `<study-id>/experiment.ts` exporting `STUDY_ID`, `EXPERIMENT_ID`, `BASE_PATH`, `STORAGE_PREFIX`. |
| D2  | `consent` and `registration` actions set page states by hand instead of using `setNextPageCookie`.                                                                              | Use `setNextPageCookie`.                                                               |
| D3  | `(pages)/+layout.server.ts` redirects to a relative path (`maxPage(...)`); some pages call `goto("end")`. Others use `/exp/ccg-01/${…}`.                                          | Always use `${BASE_PATH}/${page}`.                                                     |
| D5  | `_state/urlParams.ts` is entirely commented out. `+page.server.ts` (gate) has an unused `testQuotaStatus` function.                                                              | Delete.                                                                                 |
| D6  | `ServiceRole.ts`, `Quota.ts`, `Registration.ts`, `*Server.ts` hold server-only code but are not named `*.server.ts`. (The `$app/env/private` import already blocks client bundling, transitively.) | Rename so the boundary is visible in the file name, not only in the import graph.      |
| D7  | `SurveyMultipleChoiceQuestionDBM` and `RangeSetQuestionDBM` duplicate `getTemplate`, `rehydrateQuestion`, `cleanItemsForLocalStorage`.                                         | Extract when a third DBM needs it, not before.                                         |
