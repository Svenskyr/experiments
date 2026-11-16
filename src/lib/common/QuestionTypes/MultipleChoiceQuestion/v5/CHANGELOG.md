# QuestionTypes/MultipleChoiceQuestion

## 5.0.0-dev

- First instrument built to the Part 5 contract (`docs/style-guide/05-instruments.md`).
- The single `question` model is split into public config, key, response, and grade.
- `save` and `sync` props are replaced by one `oncommit`.
- `required: "none" | "any" | "all"` is replaced by `completion: "any" | "correct"` in the config
  and a `required` prop. A required, complete response cannot be made incomplete.
- `isTrue` moves out of the items into the key. Without the key, feedback comes from a `grade`
  prop.
- Display order is resolved once, in `buildMcq`.
- User item text renders as plain text, not HTML. At most 20 user items of at most 200 characters.
