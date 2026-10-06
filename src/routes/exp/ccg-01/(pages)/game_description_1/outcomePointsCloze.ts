import {
    buildClozeQuestion,
    type ClozeQuestionIR,
} from "$lib/common/QuestionTypes/ClozeQuestion/v1/clozeQuestion.ts";
import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";
import {
    possibleGameActions,
    possibleGameOutcomes,
} from "$exp/ccg-01/_components/ColorCoordinationGame/GameConfig.ts";
import {
    type Action,
    actionColorTitle,
    type Outcome,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";

export const OUTCOME_POINTS_CLOZE_QID = "cq:gd1:outcome-points";

export interface OutcomePointsScenario {
    actions: [Action, Action];
    outcomes: Outcome[];
}

function scenarioSeed(participantKey: string): string {
    return `${participantKey}-${OUTCOME_POINTS_CLOZE_QID}`;
}

export function pickScenarioActions(participantKey: string): [Action, Action] {
    const shuffled = FisherYatesShuffle(possibleGameActions, scenarioSeed(participantKey));
    return [shuffled[0]!, shuffled[1]!];
}

export function formatColorLabel(action: Action): string {
    return actionColorTitle(action);
}

/** Inline swatch for cloze HTML; colors come from OutcomePointsCloze CSS variables. */
export function colorSwatchMarkup(slot: "first" | "second", action: Action): string {
    const label = formatColorLabel(action);
    return `<span class="cloze-color-swatch" data-slot="${slot}" role="img" aria-label="${label}" title="${label}"></span>`;
}

function pointsOptions(correctPayoff: number): string {
    const labels = ["0 points", "1 point", "2 points"];
    return labels
        .map((label) => {
            const payoff = Number.parseInt(label, 10);
            const marker = payoff === correctPayoff ? "*" : "";
            return `${marker}[${label}]`;
        })
        .join(", ");
}

export function getOutcomePointsContentLines(participantKey: string): string[] {
    const actions = pickScenarioActions(participantKey);
    return buildContent(actions, possibleGameOutcomes);
}

function buildContent(actions: [Action, Action], outcomes: Outcome[]): string[] {
    const [first, second] = actions;
    const firstSwatch = colorSwatchMarkup("first", first);
    const secondSwatch = colorSwatchMarkup("second", second);
    const matchFirstMy = outcomes[0].payoffs[0];
    const matchFirstTheir = outcomes[0].payoffs[1];
    const matchSecondMy = outcomes[1].payoffs[0];
    const matchSecondTheir = outcomes[1].payoffs[1];
    const mismatchOnFirstMy = outcomes[2].payoffs[0];
    const mismatchOnFirstTheir = outcomes[2].payoffs[1];
    const mismatchOnSecondMy = outcomes[3].payoffs[0];
    const mismatchOnSecondTheir = outcomes[3].payoffs[1];

    return [
        // `If I chose ${firstSwatch} and the other player also chose ${firstSwatch}, I'll earn [points-first-color: ${
        //     pointsOptions(matchFirstPayoff)
        // }] for that round.`,

        // `If I chose ${firstSwatch} and the other player chose ${secondSwatch}, I'll earn [points-miscoordinate: ${
        //     pointsOptions(mismatchPayoff)
        // }] for that round.`,

        // `If I chose ${secondSwatch} and the other player also chose ${secondSwatch}, I'll earn [points-second-color: ${
        //     pointsOptions(matchSecondPayoff)
        // }] for that round.`,

        `If I choose ${firstSwatch} and they choose ${firstSwatch}, I'd earn [my-points-first-color: ${
            pointsOptions(matchFirstMy)
        }] and they'd earn [their-points-first-color: ${pointsOptions(matchFirstTheir)}].`,

        `If I choose ${firstSwatch} and they choose ${secondSwatch}, I'd earn [my-points-miscoordinate-first: ${
            pointsOptions(mismatchOnFirstMy)
        }] and they'd earn [their-points-miscoordinate-first: ${
            pointsOptions(mismatchOnFirstTheir)
        }].`,

        `If I choose ${secondSwatch} and they choose ${secondSwatch}, I'd earn [my-points-second-color: ${
            pointsOptions(matchSecondMy)
        }] and they'd earn [their-points-second-color: ${pointsOptions(matchSecondTheir)}].`,
    ];
}

export function buildOutcomePointsCloze(participantKey: string): {
    question: ClozeQuestionIR;
    scenario: OutcomePointsScenario;
} {
    const actions = pickScenarioActions(participantKey);
    const outcomes = possibleGameOutcomes;
    const question = buildClozeQuestion(
        {
            qid: OUTCOME_POINTS_CLOZE_QID,
            label: "Using the payoff table",
            content: buildContent(actions, outcomes),
            randomize: "",
        },
        participantKey,
    );
    return { question, scenario: { actions, outcomes } };
}
