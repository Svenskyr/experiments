# Part 4: Versioning and freezing

## 1. Goal

A live experiment looks and behaves the same from the day it goes live until it closes, whatever
work happens elsewhere in the repo. The only changes that reach it are corrective fixes, and each
one is recorded.

Two mechanisms do this:

- **Semantic versioning** of library modules says which changes may reach a live experiment.
- **Freezing** pins a live experiment to its dependencies and checks each build against them.

## 2. Lifecycle

| Status   | Meaning                  | Changes allowed                                                  |
| -------- | ------------------------ | ---------------------------------------------------------------- |
| `draft`  | In development           | Any                                                              |
| `pilot`  | Collecting test data     | Any. Record each change in the experiment's `CHANGELOG.md`.      |
| `live`   | Collecting real data     | Amendments (§7.1) and accepted dependency patches/minors (§7.2)  |
| `closed` | Data collection finished | Same as `live`. May be retired (§9).                             |

Moving to `live` is the **freeze** (§6). Tag the commit: `exp/<study-id>/live`. An experiment
without a `freeze.json` is `draft` or `pilot`.

The study ID's number is the experiment's major version. A redesigned study is a new experiment
(`ccg-02`), not a change to `ccg-01`.

## 3. What can change a live experiment

Measured for ccg-01: its import closure (route files + shell + everything they import,
transitively) is 115 files.

| Layer             | ccg-01         | Examples                                                         | Rule |
| ----------------- | -------------- | ---------------------------------------------------------------- | ---- |
| Experiment folder | 63 files       | `routes/exp/ccg-01/**`                                           | §5.1 |
| Library modules   | 41 files in 20 modules | `MultipleChoiceQuestion/v4`, `Randomization/v1`, `games/ccg/v3` | §4   |
| Site shell        | 11 files       | `routes/+layout.*`, `hooks.server.ts`, `root.css`, `wrangler.jsonc` | §5.2 |
| Packages          | 11             | `svelte`, `@sveltejs/kit`, `vite`, `dompurify`, `katex`          | §5.3 |
| Generated assets  | in modules     | Navigation chevron SVGs                                          | §5.4 |
| Database          | —              | `experiments.*` functions, `exp_ccg_01` schema                   | §8   |

Every library file is versioned because any of them can change a live study. For example,
`FisherYatesShuffle` in `Randomization/v1` orders survey items and game rounds, seeded per
participant. Editing it would reorder items for participants in the middle of the study. It would
also make the recorded `displayOrder` impossible to reproduce.

## 4. Semantic versioning for library modules

### 4.1 Unit and location

- The versioned unit is a **module folder**: `src/lib/<area>/<Name>/v<MAJOR>/`. Every module
  under `src/lib/common/` and `src/lib/exp/` lives in one.
- The folder name holds the major version. **The import path is the pin:** importing
  `…/MultipleChoiceQuestion/v4/…` pins major 4 and accepts its minors and patches.
- The full version is the newest heading in the folder's `CHANGELOG.md`:

  ```markdown
  # MultipleChoiceQuestion

  ## 4.1.1 — 2026-12-02 — patch
  - Fix: radio inputs lost focus outline in Safari 19.

  ## 4.1.0 — 2026-11-20 — minor
  - Add optional `maxSelections` (default: unlimited).

  ## 4.0.0 — 2026-11-09 — major
  - Initial release of v4.
  ```

### 4.2 What each level means

These definitions are stricter than usual API semver. What participants see counts as part of the
interface.

| Level     | A change is this level if…                                                                                                                                                                                         | Where it goes                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| **MAJOR** | It changes anything an existing caller's participants see or do, any default, any prop or export signature, or the model, stored, or payload shape (Part 1, §6). Visual changes count, including CSS. | New folder `v<N+1>`                        |
| **MINOR** | It only adds options that are off by default: a new optional prop or field, a new export. Existing callers render the same DOM and styles and produce the same data.                                              | Same folder; bump minor, reset patch       |
| **PATCH** | It corrects behavior that contradicts the module's intended behavior: a crash, wrong or lost data, broken rendering caused by an external change (browser, API, platform), a security problem. The visible change is limited to the defect. | Same folder; bump patch                    |

When unsure between two levels, choose the higher one.

A patch that a frozen experiment receives changes a live study. That is why accepting it is
recorded (§7.2).

### 4.3 Development versions

A new major folder starts at `<N>.0.0-dev`. While it is `-dev`, edit freely; no changelog entries
are required. Freezing an experiment releases every `-dev` version in its closure as `<N>.0.0`. A
frozen experiment never depends on a `-dev` version.

### 4.4 Other rules

- An experiment imports exactly one major of each module.
- A major may import another module's released major (`games/ccg/v3` imports
  `games/ccg/v2/avatars`). It may not import a `-dev` version once released itself.
- A new major starts as a copy of the previous major. If the reason for the break is not obvious,
  state it in the `4.0.0` changelog entry.
- Delete a major when no experiment in the build imports it.

## 5. Unversioned layers

### 5.1 Experiment folder

Frozen at `live`. Changes are amendments (§7.1).

### 5.2 Site shell

The shell is `src/routes/+layout.*`, `src/hooks.server.ts`, `src/app.html`, `src/env.ts`,
`vite.config.ts`, `wrangler.jsonc`, and everything they import outside the module folders
(`src/routes/root.css`, `src/lib/server/`, `src/lib/assets/`). Every experiment builds and renders
inside it. The list lives in `SHELL_FILES` in `scripts/lib/versioning.ts`.

- Keep the shell minimal: auth plumbing, logging, document skeleton. No participant-visible
  styling or behavior.
- Each experiment's `+layout.svelte` owns its styles (`experiment.css`, in its own `@layer`) and its
  context providers.
- A shell change is a **global change** (§7.3).

### 5.3 Packages

- Pin runtime dependencies to exact versions in `package.json` (no `^`), so an upgrade is a
  deliberate diff.
- An upgrade of a package in a frozen experiment's closure follows the package's own semver.
  Patch and minor upgrades are accepted like library patches (§7.2). Major upgrades are global
  changes (§7.3).

### 5.4 Generated assets

Commit generated files that the app imports. Keep the generator in the same module folder as its
output (as `NavigationBar/v3/NavigationChevrons.ts` does). Regenerating with a different result is
a change to that module and is versioned like any other.

### 5.5 Content

A question's text belongs to its `qid`. Changing participant-facing text in a frozen experiment
requires a new `qid` and is an amendment (see Part 3, "Fielded instruments").

## 6. Enforcement

### 6.1 `freeze.json`

Each frozen experiment has `src/routes/exp/<study-id>/freeze.json`:

```json
{
    "status": "live",
    "frozenAt": "2026-11-09",
    "commit": "42a518a",
    "modules": {
        "src/lib/common/QuestionTypes/MultipleChoiceQuestion/v4": "4.1.0",
        "src/lib/common/Randomization/v1": "1.0.0"
    },
    "files": {
        "src/lib/common/Randomization/v1/Randomization.ts": "sha256:…",
        "src/routes/exp/ccg-01/(pages)/survey/questions.ts": "sha256:…"
    },
    "packages": { "svelte": "5.57.2", "dompurify": "3.4.13" },
    "log": []
}
```

`files` lists every file in the closure. `modules` records the version of each module folder in
it.

### 6.2 Commands

| Command                                        | Does                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `bun run freeze <study-id>`                    | Release `-dev` modules in the closure. Write `freeze.json`. Set `status: "live"`. Print the tag command. |
| `bun run check:frozen`                         | Recompute every frozen experiment's closure and compare (§6.3).                                        |
| `bun run freeze <study-id> --accept`           | Accept changed module versions and package patches/minors. Copy their changelog entries into `log`.    |
| `bun run freeze <study-id> --amend "<reason>"` | Accept changes to the experiment folder, shell, or database. Add `{ date, commit, reason, files }` to `log`. |
| `bun run versions`                             | List every module, its version, and which experiments, site pages, or scripts import it. `UNUSED` marks deletable majors. |

`check:frozen` also lints every module folder (versioned location, changelog present, headings
well-formed and newest first, major matches the folder). It runs first in `bun run check`, and in
`bun run build` after `build:assets`, so regenerated assets are checked before they ship.
Implementation: `scripts/versions.ts`, `scripts/lib/versioning.ts`.

### 6.3 What the check reports

| Detected change                                                    | Result                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Module file changed, version **not** bumped                        | ✗ Fail: "Bump the version in `<module>/CHANGELOG.md` (patch or minor) or create `v<N+1>`."                    |
| Module file changed, version bumped (minor or patch)               | ✗ Fail until accepted: "ccg-01 receives MultipleChoiceQuestion 4.1.0 → 4.1.1 (patch). Run `bun run freeze ccg-01 --accept`." |
| Experiment-folder, shell, or other unversioned file changed        | ✗ Fail: "Amend (`--amend`) or revert."                                                                       |
| Package patch/minor changed                                        | ✗ Fail until accepted.                                                                                       |
| Package major changed                                              | ✗ Fail: global change (§7.3).                                                                                |
| Import moved to a new major (`v4` → `v5`)                          | ✗ Fail: amendment; frozen experiments do not change majors.                                                  |

Every failure has a one-command resolution. Fixes reach frozen experiments in the same commit as
the fix, and the experiment's `log` records the date and changelog entry for analysis.

### 6.4 Why hashes and versions, not copies

Copying a frozen experiment's `lib` dependencies into its folder would also isolate it. But it
duplicates about 40 files per experiment, so a bug fix must be applied to each copy separately. It
also leaves the shell, packages, and database shared. Hashes catch every change; version bumps
classify it; one shared copy receives the fix.

## 7. Changing a frozen experiment

### 7.1 Amendments

Amend the experiment folder, shell, or schema only to fix a defect that harms participants or
data. Never amend for wording, refactors, or style.

1. Fix the defect. If the fix belongs in a library module, make it a patch there instead (§7.2).
2. Run `bun run freeze <study-id> --amend "<reason>"`.
3. Commit. The log entry's date marks where analysis may need to split the data.

### 7.2 Accepting dependency patches and minors

1. Make the fix in the module and bump the version with a changelog entry.
2. `bun run check` lists each frozen experiment that receives it.
3. For each: if the change is a patch, check that the defect existed in that experiment. If it is
   a minor, check that the experiment does not change. Then run `--accept`.

### 7.3 Global changes

A shell change or a major package upgrade fails `check:frozen` for every frozen experiment. Handle
each frozen experiment one of two ways:

- **Verify and amend.** Run it end to end (`bun run mock-participant`, plus a manual walkthrough of
  every page). If nothing changed, amend with the reason (`"svelte 5 → 6"`).
- **Isolate.** Deploy it from its tag as its own Worker (§9) and remove it from `main`.

## 8. Database

The freeze check does not read SQL. These rules are by convention.

- **Experiment schema (`exp_<id>`).** After the freeze, a migration that touches it is an amendment.
  Name it `…_<schema>_amend_<name>.sql`.
- **Shared schema (`experiments`).** Functions follow the same semver levels. Patch and minor
  changes may replace a function in place (`CREATE OR REPLACE`). A major change creates a new
  function (`register_for_experiment_v2`); new experiments call it. Note each replacement in
  `supabase-*/CHANGELOG.md`.
- **Cron jobs** for an experiment reference only that experiment's schema.
- **Secrets** are per experiment (`PRIVATE_CCG_01_SECRET_KEY`). Never share one between
  experiments.

## 9. Retirement and isolation

- **Retire** a `closed` experiment that no longer needs to be served by deleting its folder from
  `main`. The tag preserves the code; the database keeps the data. Majors that only it used become
  deletable.
- **Isolate** a frozen experiment that must stay online but blocks a global change. Build it from
  its tag and deploy it as a separate Worker (`experiments-<study-id>`) routed at
  `/exp/<study-id>/*`. Then delete it from `main`. Confirm the route takes precedence over the
  main Worker's route before deleting.

## 10. Adoption plan for this repo

Done (2026-11-09, ccg-01 in `draft`):

1. ✓ Moved the 11 unversioned modules into `v1/` folders. Moved `lib/exp/ccg-01/Misc/bookmarklets.ts`
   to `scripts/ccg-01-bookmarklets.ts`.
2. ✓ Deleted 16 unused library majors and ccg-01's `_syncHandler/v1`, `v2`. `svelte-check` errors
   went from 43 to 15.
3. ✓ Added `CHANGELOG.md` at `<N>.0.0-dev` to all 21 remaining modules.
4. ✓ Pinned all dependencies to the versions `bun.lock` already resolved.
5. ✓ Added `scripts/versions.ts`; wired into `check` and `build`.

Remaining:

6. Freeze ccg-01 when it goes live (`bun run freeze ccg-01`), commit, and tag it.
