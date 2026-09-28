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

function buildContent(actions: [Action, Action], outcomes: Outcome[]): string[] {
    const [first, second] = actions;
    const firstSwatch = colorSwatchMarkup("first", first);
    const secondSwatch = colorSwatchMarkup("second", second);
    const matchFirstPayoff = outcomes[0].payoffs[0];
    const matchSecondPayoff = outcomes[1].payoffs[0];
    const mismatchPayoff = outcomes[2].payoffs[0];

    return [
        `If I chose ${firstSwatch} and the other player also chose ${firstSwatch}, I'll earn [points-first-color: ${
            pointsOptions(matchFirstPayoff)
        }] for that round.`,

        `If I chose ${firstSwatch} and the other player chose ${secondSwatch}, I'll earn [points-miscoordinate: ${
            pointsOptions(mismatchPayoff)
        }] for that round.`,

        `If I chose ${secondSwatch} and the other player also chose ${secondSwatch}, I'll earn [points-second-color: ${
            pointsOptions(matchSecondPayoff)
        }] for that round.`,
        // `If I chose ${secondSwatch} and the other player chose ${firstSwatch}, I'll earn [points-miscoordinate: ${
        //     pointsOptions(mismatchPayoff)
        // }] for that round.`
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
