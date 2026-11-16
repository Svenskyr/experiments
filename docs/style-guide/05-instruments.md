# Part 5: Instruments

> **Status: specification, partly implemented.** `MultipleChoiceQuestion/v5` implements §3 and §4.
> Nothing imports it yet. §5 onward (commit endpoint, registry, cookie, table) is not built. The
> v4 question types and Part 1 §6 / Part 2 §4 describe the pattern this part replaces. A how-to
> guide follows once an experiment runs on it.

## 1. Terms

| Term         | Meaning                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| **Public**   | The part of an instrument's configuration the participant may see. Authored, read-only.       |
| **Key**      | The part the participant must not change and may not be allowed to see: answers, scoring.     |
| **Response** | Everything the participant produced, and nothing else.                                        |
| **Grade**    | The result of applying the key to a response. Derived; never authored, never trusted from the client. |
| **Status**   | `"empty" \| "partial" \| "complete"`. Derived from public, response, and grade.               |
| **Commit**   | The moment a response has changed and is at rest. The only event an instrument emits.         |
| **Registry** | Server-side map from instrument ID to its page, its kind, whether it is required, and how to build its configuration. |

Two things that v4 stored in one field are separate:

- The **completion rule** (what counts as complete) is part of the instrument's public
  configuration.
- **Required** (whether the page needs this instrument complete) is a boolean in the registry.
  `load` passes it to the component.

**A required instrument stays complete.** Once its status is `complete`, its response can change
but its status cannot fall. An optional instrument can be cleared at any time. So "required" and
"can be cleared" never hold together, and a completed page never becomes incomplete.

## 2. Layers

Each layer knows only its own row.

| Layer                  | Knows                                             | Does not know                              |
| ---------------------- | ------------------------------------------------- | ------------------------------------------ |
| Instrument (`lib/`)    | Public, response, grade, "committed"              | Storage, network, pages, permissions       |
| Client record module   | Instrument ID, response, the sync queue           | What a response means; completeness        |
| Page                   | Which instruments it shows; status for display    | How responses are stored or validated      |
| Commit endpoint        | Registry, key, database, cookie                   | How an instrument renders                  |

An instrument never decides when to save or sync. The page never decides permission.

## 3. Model module

Every instrument's model module exports four types and one `model` object. The shared types live
in `lib/common/Instrument/v1/Instrument.ts`.

```ts
export type Status = "empty" | "partial" | "complete";

export interface InstrumentConfig<P, K = undefined> {
    id: string;
    kind: string; // Selects the model module on the server
    public: P;
    key?: K | undefined; // Present only where grading runs
}

export interface InstrumentModel<P, K, R, G = undefined> {
    kind: string;
    emptyResponse(pub: P): R;
    parseResponse(pub: P, raw: unknown): R | null; // Field by field; null rejects (Part 2 §7)
    status(pub: P, response: R, grade?: G): Status; // Pure. Runs on client and server.
    grade?(pub: P, key: K, response: R): G; // Pure. Runs wherever the key is.
}
```

Rules:

- `model` is a plain object of functions, not a class.
- `status` and `grade` take no clock, storage, or network input. A timer's elapsed time is part
  of its response.
- Commands keep the Part 2 §3 form and mutate the response in place:
  `selectItem(pub, response, itemId, true)`.
- When `required` is true, a command that would take a complete response to a lower status is a
  no-op (Part 2 §3: commands validate and no-op). A range set that needs at least one value lets
  the participant reset any slider except the last one set. Where a no-op is not possible (a
  cleared text field), the component restores the last complete response instead of committing.
- A partial history that scoring needs (the MCQ's "was ever selected") is a field of that
  instrument's response type. There is no general history mechanism and no append-only log.
- Seeded display order is resolved once in `load` and is part of public.

## 4. Component

```ts
let {
    id, // The instrument's ID; prefixes DOM IDs and input names
    config, // P
    key, // K | undefined: present only under local feedback
    required = false, // From the registry. True: status cannot fall once complete (§3).
    response = $bindable<R>(),
    grade, // G | undefined: from the server, or computed locally from key
    oncommit,
}: Props = $props();
```

- The parent owns `response` and binds it. The component edits it through commands.
- `oncommit()` takes no policy arguments. The component calls it at every commit point and
  nowhere else. A command that turned out to be a no-op is not a commit.
- With `key`, the component grades in the browser. Without it, it shows the `grade` prop. A grade
  records which response it was computed for, so `status` ignores a grade that is out of date.
- Without `oncommit` the component works as a demo.
- UI-only state stays in the component (Part 2 §4).

### Commit points

| Input                    | Transient (no commit)      | Commit                                   |
| ------------------------ | -------------------------- | ---------------------------------------- |
| Radio, checkbox, select  | none                       | Every change                             |
| Slider                   | Drag (`oninput`)           | Release (`onchange`)                     |
| Free text                | Keystrokes                 | Blur, or 2 seconds without a keystroke   |
| Reset, delete, add item  | none                       | Every action                             |
| Timer                    | Ticks                      | Expiry, a fixed interval, and page leave |

A deletion or reset is a commit like any other. A required instrument hides or disables the
controls that §3 turns into no-ops.

## 5. Persistence

There is one write path. The client never writes responses to the database.

```text
commit
  → client: write response to localStorage (draft)
  → client: enqueue instrument ID on SyncHandler
  → SyncHandler: read the latest draft; POST { instrumentId, response } to the commit endpoint
  → server: verify cookie → registry lookup → rebuild config → parseResponse
            → grade (if the kind has a key) → status → upsert one row → await success
            → update cookie (§6) → return { grade?, expState }
  → client: merge expState; hand grade to the instrument
```

Rules:

1. **The queue holds IDs, not payloads.** A retry sends the latest draft, so no stale write exists.
2. **Commits are sequential.** One request is in flight at a time. Every submission that can
   change a page's completeness goes through the queue, including cloze and game submissions.
3. **One upsert per commit.** No page snapshots, no separate reads.
4. **An empty response is sent as `null` and stored as `null`.** The row is upserted, never
   deleted.
5. **The server builds the row.** It uses its own configuration, not client copies of question
   text or correctness.
6. **Rejected is not failed.** A response `parseResponse` rejects is dropped and logged. A
   network or database failure stays in the queue and retries.
7. The stored shape is the response shape. Per-instrument client DBMs and their clean/rehydrate
   functions are not needed.

## 6. Flow

The signed `expState` cookie carries each page's progress.

| Page state            | Cookie holds                                                |
| --------------------- | ----------------------------------------------------------- |
| In progress           | IDs of required instruments whose status is `complete`      |
| Complete              | `completed: true` only; the ID set is dropped               |

On each commit the server:

1. Rejects the commit if the instrument is required, the cookie records it as complete, and the
   new status is lower. Honest clients never send this (§3).
2. Adds the instrument's ID to its page's set if it is required and now complete.
3. If every required instrument on the page is complete: sets `completed`, grants the next page.

Consequences:

- Page completion only moves forward. There is no revocation for lost completeness. An action
  can still revoke a page by design (for example, no replaying the game).
- There is no separate grant request. The grant arrives with the response to the last commit.
- Preloading the next page starts when the client sees the grant, as it does today.
- The navigation bar reads permission from `expState`. The page computes `status` only for
  display (for example, the list of incomplete questions).
- A participant cannot advance until their last commit has reached the server. While it is
  pending, the navigation bar says the responses are still saving.

### Guarantee and its limit

Holding the grant means every required instrument on the page had a complete response written
to the database, and its row exists.

The server holds no session state, so the check in step 1 relies on the cookie. A client that
restores an older cookie can get a lower-status response to a required instrument accepted. The
database then shows that response. Detect this at analysis. Optional instruments the participant
never touched have no row.

## 7. Feedback and grading

The recorded grade is always computed on the server. The registry decides one thing per
instrument: whether `load` also ships the key.

| Key shipped | Feedback shown                              | Use for                          |
| ----------- | ------------------------------------------- | -------------------------------- |
| Yes         | Immediately, from `grade` run in the browser | Low stakes; speed matters        |
| No          | After the commit response                   | Anything that affects payment    |

Permission follows the server in both cases.

## 8. Timers

A timer is an instrument. Its response is elapsed time; it is complete when elapsed time reaches
its duration.

- **Minimum time.** Always checked on the server. The server stamps the page's first-served time
  in the cookie and compares it with its own clock when the timer commits. Wall-clock time is
  never less than client-measured time, so an honest client is never rejected.
- **Deadline.** A per-timer setting.
  - Lax (default): client timing only. No server check, no extra database work.
  - Strict: the server writes the first-served time to the timer's row when it first serves the
    page (insert if absent). A strict timer governs every instrument on its page. Commits to
    those instruments are checked against the stored time plus a grace period, in the same
    database call as the upsert, using the database clock. A late commit is rejected and the
    row keeps the last accepted response. Cookie replay does not reset a strict deadline.
- Status changes without a participant action. Pages read status reactively, never from commit
  events.

## 9. Other instruments

- **Feedback** and **page time tracking** commit through the same path. They are never required
  and have no completion rule.
- **The game** keeps its own model and endpoint logic. It exposes a status and commits through
  the queue.

## 10. Database

- One row per session and instrument ID. Every write is an upsert.
- Comprehension and survey responses share one table.
- The client has no write grants on response tables.

| Column            | Type          | Null     | Holds                                                    |
| ----------------- | ------------- | -------- | -------------------------------------------------------- |
| `session_id`      | key           | not null | With `instrument_id`, the primary key                    |
| `instrument_id`   | `text`        | not null | The instrument's `id`                                    |
| `page`            | `text`        | not null | From the registry                                        |
| `instrument_type` | `text`        | not null | The instrument's `kind`                                  |
| `question_text`   | `text`        | null     | From the server's configuration; null where none exists  |
| `response`        | `jsonb`       | null     | The response; null when empty                            |
| `status`          | `text`        | not null | Computed by the server at write                          |
| `grade`           | `jsonb`       | null     | Present only for kinds with a key                        |
| `served_at`       | `timestamptz` | null     | Strict deadline timers only (§8); written by the server  |

Display order is not stored. It is seeded by the session and can be rebuilt.

## Rules this part replaces

| Rule                                                        | Replaced by |
| ----------------------------------------------------------- | ----------- |
| Part 1 §6: per-instrument DBM with `load/save/sync/submit`  | §5          |
| Part 1 §5: page `$effect` calls `requestNextPageCookie`     | §6          |
| Part 2 §4: one bindable model prop plus `save` and `sync`   | §4          |
| Part 2 §10: "Never block navigation on the network"         | §6: the grant waits for the last commit; nothing else does |
