# Style guide

Three parts. Read the part that matches the task.

| Part                                                       | Use it when                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| [1. Experiment architecture](01-experiment-architecture.md) | Creating an experiment, adding a page, or adding a persisted instrument.    |
| [2. Code patterns](02-code-patterns.md)                     | Writing or reviewing any `.ts` or `.svelte` file.                           |
| [3. Language](03-language.md)                               | Writing any participant-facing text: instructions, questions, labels, copy. |
| [4. Versioning and freezing](04-versioning.md)              | Changing any shared code, upgrading packages, or taking an experiment live. |

`docs/project-context.md` describes what exists. This guide describes how new work should be done.
Where current code deviates from the guide, each part lists the deviation under **Known
deviations**. Fix deviations in new versions, not in place (see Part 2, §8).

**Reference implementation:** `src/routes/exp/ccg-01/`. **Reference components:** the highest
version of each component under `src/lib/common/QuestionTypes/`.
