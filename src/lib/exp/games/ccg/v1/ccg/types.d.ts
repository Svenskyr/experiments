// Parameters: Information/state that is independent of time and action. Player characteristics, game setup, etc.
// History: Information/state that is dependent on time and action. Player choices, outcomes, metadata, etc.
// deno-lint-ignore-file no-explicit-any

interface Player {
    uid: string;
    avatar: Avatar;
}
interface Avatar {
    name: string;
    path: string;
}
interface Action {
    key: string;
    value: any;
    color?: string;
}
interface PlayerHistory extends Player {
    choice: Action;
    payoff: number;
}
interface Outcome {
    key: string;
    value: [number, number];
}

// type GameOutcome = Record<string, number[]>;

export interface GameInstanceParameters {
    players: [Player, Player];
    actions: [Action, Action];
    outcomes: Outcomes[];
}

export interface GameInstanceRecord {
    rid?: number;
    round_number: number;
    player_1_uid: string;
    player_1_avatar: string;
    player_2_uid?: string;
    player_2_avatar: string;
    choice_option_1: string;
    choice_option_2: string;
    outcome_c1c1: [number, number];
    outcome_c2c2: [number, number];
    outcome_c1c2: [number, number];
    outcome_c2c1: [number, number];
    player_1_chose: string;
    player_2_chose?: string;
    player_1_payoff?: number;
    player_2_payoff?: number;
    time_elapsed_seconds: number;
    matched_rid?: number;
}

export interface GameSessionProps {
    player1UID: string;
    player1Avatar: Avatar;
    possiblePlayer2Avatars: Avatar[];
    possibleActions: Action[];
    outcomes: Outcomes[];
    roundsPlayed?: number;
    maxRounds?: number;
}

export interface PermutationCount {
    permutation: GameInstanceParameters;
    count: number;
}
