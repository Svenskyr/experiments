# Part 3: Language

Applies to all participant-facing text: instructions, questions, response options, cloze
statements, labels, buttons, status messages, and consent copy.

## 1. The standard

Each sentence must pass two tests:

1. **Exact.** A reasonable participant can read it only one way, and that reading is true.
2. **Minimal.** Removing any word loses a fact, a constraint, or required clarity.

Exactness wins when the two conflict. Text that is short but ambiguous produces noisy data. Text
that is long but exact only costs reading time.

## 2. Terminology

Define every term with a game, scoring, or payment meaning once, in a glossary for the experiment.
Then use exactly that word everywhere, including consent, instructions, questions, and buttons.
Never use a synonym for variety.

Glossary format (put it in the experiment's `Design.md`). The rows below are a draft for ccg-01;
the researcher sets the definitions.

| Term              | Definition                                                                  | Do not use              |
| ----------------- | --------------------------------------------------------------------------- | ----------------------- |
| game round        | One decision by the participant against one other player.                  | round, trial, game      |
| other player      | The participant randomly selected as the opponent for one game round.      | Player B, partner, opponent |
| option            | One of the two colors offered in a game round.                              | choice, action, color   |
| points            | Units earned in the study. Converted to payment at _rate_.                  | payoff, score, reward   |
| prediction points | Points earned from predictions.                                             | bonus points, bonus     |
| payment           | Money paid to the participant.                                               | compensation, reward, payoff |

ccg-01 currently mixes _points_, _bonus points_, _payoff_, _final payoff_, _compensation_, and
_payment_. It also mixes _the other player_ (game_description_1) with _Player B_ (game_description_2).

## 3. Instructions

- **Second person, present tense, active voice.** "You choose one option." Not "An option will be
  chosen by the participant."
- **Action first, then the result.** "Select a color by clicking on it." → "Click a color to select
  it."
- **State conditions as conditions.** "If you both choose the same option, you each earn points."
- **State numbers exactly, as numerals.** "48 game rounds", "6 hours", "$2". Spell a number out only
  when spelling it is the point, e.g. an attention check ("two point five").
- **State rules, not likelihoods, when the rule is known.** "may lose your slot" is inexact if the
  rule is deterministic. State the rule.
- **One fact per bullet.** If a bullet needs "and", consider two bullets.
- **No filler.** Delete "Please note that", "basically", "simply", "just", "in order to".
- **Say "please" once, for a request, not for information.**

Example, from the gate page:

> ❌ Please note that if you leave the study for more than 6 hours (360 minutes), you may lose your
> slot in the study.
>
> ✅ After 6 hours of inactivity, your slot is no longer reserved. If you return after that, you can
> continue only if a slot is still available.

The original says "leave" (the rule is inactivity). It says "may" without saying what decides the
outcome. It also repeats the duration in minutes.

## 4. Questions

### Stem matches scale

The stem asks exactly what the scale measures. If the scale is agreement, the stem asks for
agreement. If the scale is importance, the stem asks for importance.

| Current stem (ccg-01 survey)                                                  | Scale labels                                     | Problem                     | Exact stem                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------- | --------------------------------------------------------------------- |
| How would you describe your own gender?                                       | Not at all … Strongly                            | "Describe" ≠ intensity      | How strongly do you identify with each gender below?                  |
| How much do you think these factors contribute to gender identity in general? | Not important at all … Very important            | "Contribute" ≠ "important"  | How important is each factor in determining a person's gender identity? |
| What do you think about gender norms?                                          | Strongly disagree … Strongly agree               | Open stem, agreement scale  | How much do you agree with each statement?                            |
| How would you describe your social views?                                     | Not at all … Strongly                            | "Describe" ≠ intensity      | How strongly does each label describe your social views?              |

> **Fielded instruments.** Changing a question's wording changes the instrument. Data collected
> under different wording is not comparable. Change text only in a new experiment or a new,
> versioned question ID.

### Items

- One idea per item. No "and"/"or" joining two claims.
- Parallel grammar across items in one question.
- Response options are mutually exclusive and, with "Other" or user items, exhaustive.
- Do not put the question number in `questionText` ("1. How…"). Display order is a rendering
  concern.
- Use `tooltipText` to clarify a term, not to add a second condition.

## 5. Cloze statements

Cloze statements are first person ("I earn points by …"). The participant completes a true
statement about the rules.

Each blank must satisfy all of these:

1. **Every option is grammatical** when substituted into the sentence.
2. **Options are parallel**: same part of speech, similar length.
3. **Options are mutually exclusive.** No option is a subset of another.
4. **Exactly one option is true.**
5. **The blank tests one fact.** Two blanks in one sentence test two different facts.
6. **The surrounding text does not reveal the answer.**

Example, from `game_description_2/clozeSource.ts`:

> ❌ The color slider is how I give my prediction for [the percentage of other participants | how
> much I'll like] that [will choose each color | particular color].
>
> Substituting the distractors gives "how much I'll like that particular color", which is a
> different sentence structure (rule 1) and different lengths (rule 2).
>
> ✅ I use the color slider to predict [what percentage of other participants will choose | how much
> other participants like] each color.

> ❌ … then I should set that color to [at least 50% | less than 50% | less than 25%] of the slider.
>
> "Less than 25%" is a subset of "less than 50%" (rule 3). "Most" means more than 50%, so "at least
> 50%" is not exactly true (rule 4).
>
> ✅ … then I should set that color to [more than 50% | less than 50%] of the slider.

> ❌ Predictions that are [more accurate | less accurate] earn more points than predictions that
> are [less accurate | more accurate].
>
> The second blank is determined by the first (rule 5).
>
> ✅ More accurate predictions earn [more | fewer] points than less accurate predictions.

## 6. Interface text

| Element          | Rule                                                        | Example                                        |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Heading          | Sentence case. Noun phrase.                                 | "Comprehension questions", not "Study Summary" |
| Button           | Verb, or verb + object. States what happens.                | "Check answers", "Continue without payment"    |
| Status (ongoing) | Present participle + "…" (one character, U+2026).           | "Checking quota…"                              |
| Status (done)    | Plain statement. No exclamation mark.                       | "A slot is available."                         |
| Error            | What happened, then what to do.                             | "Your session expired. Reload the page to continue." |
| Link text        | Names the destination. Never "click here".                  | "Return to Prolific"                           |

Do not show internal terms to participants: _quota_, _session_, _role_, _sync_. Use _slot_,
_study_, and so on.

> ❌ Within study quota!
>
> ✅ A slot is available.

## 7. Emphasis

- `<strong>` marks the one word that distinguishes two otherwise similar statements: "you earn points
  only if you both choose the **same** option".
- `<em>` marks a defined term at its first use.
- Never `<u>`: it reads as a link.
- At most one emphasized phrase per sentence. If everything is emphasized, nothing is.

## 8. Mechanics

- Spell and grammar check all copy before fielding. The ccg-01 consent page contains "asked to
  participant" (→ participate) and "principle investigator" (→ principal).
- Ranges use an en dash without spaces: "15–20 minutes".
- Money: "$2", "$9.60". Percentages: "50%".
- Labels match IDs: a `qid` describes its content (`cq:gd2:other-players` labels a question about
  the color slider).

## 9. Review checklist

For each sentence:

- [ ] Can it be read two ways? Rewrite until it cannot.
- [ ] Is it true under the implemented rules? Check the code or the SQL.
- [ ] Does every game, scoring, or payment term match the glossary?
- [ ] Can any word be removed without losing a fact? Remove it.

For each question:

- [ ] Does the stem ask what the scale measures?
- [ ] Is each item one idea, grammatically parallel to the others?
- [ ] For cloze: does every option pass all six rules in §5?
