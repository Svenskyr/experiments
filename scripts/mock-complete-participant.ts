/**
 * Mock one or more completed ccg-01 participant sessions through application logic.
 *
 * Prerequisites:
 *   - Local/preview Supabase with migrations applied
 *   - For --strict / --finalize: migration 20260813016 (bootstrap_mock_mirror_theta)
 *
 * Run (local Supabase + migrations applied):
 *   deno task mock-participant
 *   deno task mock-participant -- --count 3 --strict
 *   deno task mock-participant -- --count 3 --finalize
 *   deno task mock-participant -- --count 1 --cleanup
 *
 * Options:
 *   --count N          Number of participants (default: 3)
 *   --rounds N         Game rounds per participant (default: 48)
 *   --pid-prefix STR   PID prefix (default: mock-ccg)
 *   --platform STR     Platform label (default: mock)
 *   --cleanup          Delete created sessions when done (default: leave in DB)
 *   --strict           Require valid_record and full round scoring after rescore
 *   --finalize         Run exp_ccg_01_final.finalize_participant_sessions (preview DB only)
 *   --dry-run          No database writes
 */

import {
    clearCCGGameLocalStorage,
    createServiceClient,
    installLocalStorageMock,
    type RegisteredSession,
    SessionRegistry,
    setupExperimentSession,
    signInParticipant,
} from "./lib/ccg-01-test-session.ts";

installLocalStorageMock();

import type { MultipleChoiceQuestion } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { newMultipleChoiceQuestion } from "$lib/common/QuestionTypes/MultipleChoiceQuestion/v4/MultipleChoiceQuestion.ts";
import { newRangeSetQuestion } from "$lib/common/QuestionTypes/RangeSetQuestion/v4/RangeSetQuestion.ts";
import type { ExperimentState } from "$exp/ccg-01/_state/ExperimentState.ts";
import { multipleChoiceQuestions as gd1Questions } from "$exp/ccg-01/(pages)/game_description_1/questions.ts";
import { multipleChoiceQuestions as gd2Questions } from "$exp/ccg-01/(pages)/game_description_2/questions.ts";
import {
    multipleChoiceQuestions as surveyMcqTemplates,
    rangeSetQuestions as surveyRangeSetTemplates,
} from "$exp/ccg-01/(pages)/survey/questions.ts";
import {
    getUnsynced,
    roundsStorageKey,
    save as saveGameSession,
    submit as submitGameRounds,
} from "$exp/ccg-01/_database/CCGGameDBM.ts";
import * as RangeSetDBM from "$exp/ccg-01/_database/RangeSetQuestionDBM.ts";
import * as SurveyMcqDBM from "$exp/ccg-01/_database/SurveyMultipleChoiceQuestionDBM.ts";
import {
    recordedGameConfig,
    recordedMaxRounds,
    recordedShuffleSeed,
} from "$exp/ccg-01/_components/ColorCoordinationGame/GameConfig.ts";
import { SyncHandler } from "$exp/ccg-01/_syncHandler/v3/SyncHandler.ts";
import {
    type GameSession,
    getCurrentPermutation,
    isGameComplete,
    mergeGameSession,
    newGameSession,
    shouldSync,
    submitRound,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";

interface MockAvatar {
    name: string;
    path: string;
}

const MOCK_AVATARS: MockAvatar[] = [
    { name: "fem1", path: "" },
    { name: "fem2", path: "" },
    { name: "masc1", path: "" },
    { name: "masc2", path: "" },
];

const COMPREHENSION_QIDS = [
    ...gd1Questions.map((q) => q.qid),
    ...gd2Questions.map((q) => q.qid),
];

const EXPECTED_SURVEY = surveyRangeSetTemplates.length + surveyMcqTemplates.length;
const ATTENTION_CHECK_VALUE = 2.5;
const VALIDITY_MODULES = [
    "completion",
    "comprehension",
    "game_rounds",
    "predictions",
    "survey",
] as const;

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomAvatar(): MockAvatar {
    return MOCK_AVATARS[randomInt(0, MOCK_AVATARS.length - 1)];
}

interface CliOptions {
    count: number;
    rounds: number;
    pidPrefix: string;
    platform: string;
    noCleanup: boolean;
    dryRun: boolean;
    strict: boolean;
    finalize: boolean;
}

function parseCli(): CliOptions {
    const args = Deno.args;
    const getFlag = (name: string): string | undefined => {
        const i = args.indexOf(name);
        return i >= 0 ? args[i + 1] : undefined;
    };
    const hasFlag = (name: string) => args.includes(name);

    const roundsRaw = Number(getFlag("--rounds") ?? "48");
    const participantMax = recordedMaxRounds("participant");
    const rounds = Math.min(
        participantMax,
        Math.max(1, Number.isFinite(roundsRaw) ? roundsRaw : participantMax),
    );

    return {
        count: Math.max(1, Number(getFlag("--count") ?? "3") || 3),
        rounds,
        pidPrefix: getFlag("--pid-prefix") ?? "mock-ccg",
        platform: getFlag("--platform") ?? "mock",
        noCleanup: !hasFlag("--cleanup"),
        dryRun: hasFlag("--dry-run"),
        strict: hasFlag("--strict"),
        finalize: hasFlag("--finalize"),
    };
}

function buildExpState(registered: RegisteredSession, platform: string): ExperimentState {
    return {
        user: {
            authUserId: registered.authUserId,
            pid: registered.pid,
            platform,
        },
        session: {
            sessionId: registered.sessionId,
            role: "participant",
        },
        pages: {},
        signature: null,
    };
}

let cliOptions: CliOptions;

export function buildCorrectComprehensionItems(question: MultipleChoiceQuestion) {
    return {
        canonicalItems: question.canonicalItems.map((item) => ({
            itemId: item.itemId,
            itemText: item.itemText,
            isSelected: !!item.isTrue,
            wasSelected: !!item.isTrue,
            displayOrder: item.displayOrder,
        })),
    };
}

async function submitAllComprehension(sessionId: string): Promise<void> {
    const supabase = createServiceClient();
    const allQuestions = [...gd1Questions, ...gd2Questions];
    for (const question of allQuestions) {
        const stored = buildCorrectComprehensionItems(question);
        const items = stored.canonicalItems.map((item) => ({
            itemId: item.itemId,
            itemText: item.itemText,
            isSelected: item.isSelected,
            wasSelected: item.wasSelected,
            isTrue: item.isSelected,
            displayOrder: item.displayOrder,
        }));
        const selected = items.filter((item) => item.wasSelected);
        const trueCount = selected.filter((item) => item.isTrue === true).length;
        const score = Math.round((trueCount / selected.length) * 100) / 100;

        const { error } = await supabase
            .schema("exp_ccg_01")
            .from("comprehension")
            .insert({
                session_id: sessionId,
                qid: question.qid,
                question_text: question.questionText,
                responses: items,
                score,
            });
        if (error) throw new Error(`comprehension ${question.qid}: ${error.message}`);
    }
}

async function flushGameRoundSync(syncHandler: SyncHandler): Promise<void> {
    let attempts = 0;
    while (getUnsynced().length > 0) {
        attempts++;
        if (attempts > 20) {
            throw new Error("game round sync exceeded retry limit");
        }
        const { error } = await submitGameRounds(syncHandler, roundsStorageKey);
        if (error) throw new Error(`submit_game_rounds: ${error.message}`);
    }
}

export async function playRecordedGame(
    expState: ExperimentState,
    syncHandler: SyncHandler,
    roundCount: number,
): Promise<void> {
    clearCCGGameLocalStorage();

    const shuffleSeed = recordedShuffleSeed(expState);
    const config = {
        ...recordedGameConfig(expState),
        maxRounds: roundCount,
    };

    let session: GameSession = newGameSession(config, null, shuffleSeed);
    mergeGameSession(session, { selectedAvatar: pickRandomAvatar() }, shuffleSeed);
    saveGameSession(session);

    while (!isGameComplete(session)) {
        const perm = getCurrentPermutation(session);
        const choice = perm.actions[Math.random() < 0.5 ? 0 : 1].key;
        const prediction = randomInt(0, 100);
        const elapsedSeconds = randomInt(1, 45) + Math.random();
        submitRound(session, choice, prediction, elapsedSeconds);
        saveGameSession(session);
        if (shouldSync(session) || isGameComplete(session)) {
            await flushGameRoundSync(syncHandler);
        }
    }

    if (getUnsynced().length > 0) {
        await flushGameRoundSync(syncHandler);
    }

    if (session.rounds.length !== roundCount) {
        throw new Error(`expected ${roundCount} rounds, got ${session.rounds.length}`);
    }
}

function rangeSetValueForItem(qid: string, itemId: string, min: number, max: number): number {
    if (qid === "survey-gender-norms" && itemId === "attention-check") {
        return ATTENTION_CHECK_VALUE;
    }
    return (min + max) / 2;
}

export async function submitSurvey(syncHandler: SyncHandler): Promise<void> {
    for (const template of surveyRangeSetTemplates) {
        const question = newRangeSetQuestion(template, {
            canonicalItems: template.canonicalItems.map((item) => ({
                itemId: item.itemId,
                itemText: typeof item.itemText === "string" ? item.itemText : "",
                value: rangeSetValueForItem(template.qid, item.itemId, template.min, template.max),
                displayOrder: item.displayOrder,
            })),
        });
        RangeSetDBM.save(question);
        const key = `exp_ccg_01:rsq:${question.qid}`;
        const { error } = await RangeSetDBM.submit(syncHandler, key);
        if (error) throw new Error(`survey range set ${question.qid}: ${error.message}`);
    }

    for (const template of surveyMcqTemplates) {
        const question = newMultipleChoiceQuestion(template, {
            canonicalItems: template.canonicalItems.map((item, index) => ({
                itemId: item.itemId,
                itemText: item.itemText,
                isSelected: index === 0,
                wasSelected: index === 0,
                displayOrder: item.displayOrder,
            })),
        });
        SurveyMcqDBM.save(question);
        const key = `exp_ccg_01:survey-mcq:${question.qid}`;
        const { error } = await SurveyMcqDBM.submit(syncHandler, key);
        if (error) throw new Error(`survey mcq ${question.qid}: ${error.message}`);
    }
}

export async function completeSession(sessionId: string): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.schema("exp_ccg_01").rpc(
        "complete_experiment_session",
        { p_session_id: sessionId },
    );
    if (error) throw new Error(`complete_experiment_session: ${error.message}`);
}

interface CcgSessionRow {
    valid_record: boolean | null;
    completion_points: number | null;
    comprehension_points: number | null;
    game_coordination_points: number | null;
    game_prediction_points: number | null;
    total_points: number | null;
    attention_check_correct: boolean | null;
    validity_report: Record<string, unknown> | null;
}

function formatValidityReport(report: Record<string, unknown> | null): string {
    if (!report) return "(no validity_report)";
    const modules = report.modules as Record<string, unknown> | undefined;
    if (!modules) return JSON.stringify(report, null, 2);
    const summary = Object.fromEntries(
        Object.entries(modules).map(([key, value]) => [key, value]),
    );
    return JSON.stringify({ valid: report.valid, modules: summary }, null, 2);
}

export async function assertCompletedSession(
    sessionId: string,
    expectedRounds: number,
    options: { strict?: boolean } = {},
): Promise<boolean> {
    const strict = options.strict ?? false;
    const supabase = createServiceClient();

    const { data: expSession, error: expErr } = await supabase
        .schema("experiments")
        .from("sessions")
        .select("status, completed_at")
        .eq("session_id", sessionId)
        .single();
    if (expErr) throw new Error(expErr.message);
    if (expSession.status !== "completed" || !expSession.completed_at) {
        throw new Error(`session not completed: ${JSON.stringify(expSession)}`);
    }

    const { data: ccgSession, error: ccgErr } = await supabase
        .schema("exp_ccg_01")
        .from("sessions")
        .select(
            "valid_record, completion_points, comprehension_points, game_coordination_points, game_prediction_points, total_points, attention_check_correct, validity_report",
        )
        .eq("session_id", sessionId)
        .single();
    if (ccgErr) throw new Error(ccgErr.message);
    const session = ccgSession as CcgSessionRow;

    if (session.completion_points !== 200) {
        throw new Error(`completion_points=${session.completion_points}, expected 200`);
    }
    for (
        const field of [
            "comprehension_points",
            "game_coordination_points",
            "game_prediction_points",
            "total_points",
        ] as const
    ) {
        if (session[field] == null) {
            throw new Error(`${field} is null`);
        }
    }

    if (session.attention_check_correct !== true) {
        throw new Error(
            `attention_check_correct=${session.attention_check_correct}, expected true`,
        );
    }

    const report = session.validity_report;
    if (!report || typeof report !== "object") {
        throw new Error("validity_report missing or invalid");
    }
    const modules = report.modules as Record<string, unknown> | undefined;
    if (!modules) {
        throw new Error("validity_report.modules missing");
    }
    for (const mod of VALIDITY_MODULES) {
        if (!(mod in modules)) {
            throw new Error(`validity_report.modules.${mod} missing`);
        }
    }

    const { count: compCount } = await supabase
        .schema("exp_ccg_01")
        .from("comprehension")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);
    if (compCount !== COMPREHENSION_QIDS.length) {
        throw new Error(`comprehension rows ${compCount}, expected ${COMPREHENSION_QIDS.length}`);
    }

    const { count: roundCount } = await supabase
        .schema("exp_ccg_01")
        .from("game_rounds")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);
    if (roundCount !== expectedRounds) {
        throw new Error(`game_rounds ${roundCount}, expected ${expectedRounds}`);
    }

    const { data: rounds, error: roundsErr } = await supabase
        .schema("exp_ccg_01")
        .from("game_rounds")
        .select("rid, coordination_score, target_θ")
        .eq("session_id", sessionId);
    if (roundsErr) throw new Error(roundsErr.message);

    const scoredRounds = (rounds ?? []).filter(
        (r) => r.coordination_score != null && r.target_θ != null,
    );
    const allRoundsScored = scoredRounds.length === (rounds ?? []).length;

    if (strict && !allRoundsScored) {
        throw new Error(
            `game rounds scoring incomplete: ${scoredRounds.length}/${
                rounds?.length ?? 0
            } scored\n${formatValidityReport(report)}`,
        );
    }

    const { count: surveyCount } = await supabase
        .schema("exp_ccg_01")
        .from("survey")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);
    if ((surveyCount ?? 0) < EXPECTED_SURVEY) {
        throw new Error(`survey rows ${surveyCount}, expected ${EXPECTED_SURVEY}`);
    }

    if (strict && !session.valid_record) {
        throw new Error(
            `valid_record is not true after completion\n${formatValidityReport(report)}`,
        );
    }

    return session.valid_record === true;
}

export async function rescanGameStats(): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.schema("exp_ccg_01").rpc("rescan_game_stats");
    if (error) throw new Error(`rescan_game_stats: ${error.message}`);
}

async function bootstrapMirrorGameStats(sessionIds: string[]): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.schema("exp_ccg_01").rpc(
        "bootstrap_mock_mirror_theta",
        { p_session_ids: sessionIds },
    );
    if (error) {
        if (error.message.includes("bootstrap_mock_mirror_theta")) {
            throw new Error(
                "bootstrap_mock_mirror_theta RPC not found; apply migration supabase-preview/supabase/migrations/20260813016_exp_ccg_01_bootstrap_mock_mirror_theta.sql",
            );
        }
        throw new Error(`bootstrap_mock_mirror_theta: ${error.message}`);
    }
}

export async function resynthesizeAndRescoreSession(sessionId: string): Promise<void> {
    const supabase = createServiceClient();
    const { error: synthErr } = await supabase.schema("exp_ccg_01").rpc(
        "synthesize_game_round_outcomes",
        { p_session_id: sessionId, p_overwrite: true },
    );
    if (synthErr) throw new Error(`synthesize_game_round_outcomes: ${synthErr.message}`);

    const { error: scoreErr } = await supabase.schema("exp_ccg_01").rpc(
        "score_and_validate_session",
        { p_session_id: sessionId },
    );
    if (scoreErr) throw new Error(`score_and_validate_session: ${scoreErr.message}`);
}

export async function batchRescoreSessions(sessionIds: string[]): Promise<void> {
    console.log("\nBatch rescore: rescan_game_stats…");
    await rescanGameStats();

    console.log("  Bootstrap mirror game_stats θ for mock permutations…");
    await bootstrapMirrorGameStats(sessionIds);

    for (const sessionId of sessionIds) {
        console.log(`  Resynthesize + rescore ${sessionId}…`);
        await resynthesizeAndRescoreSession(sessionId);
    }
}

interface ExperimentQuotaSnapshot {
    quota: number;
    participants_completed: number;
    participants_in_progress: number;
    last_quota_admission_at: string;
    admission_registration_interval: string;
}

async function getExperimentSnapshot(): Promise<ExperimentQuotaSnapshot> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .schema("experiments")
        .from("experiments")
        .select(
            "quota, participants_completed, participants_in_progress, last_quota_admission_at, admission_registration_interval",
        )
        .eq("experiment_id", "exp_ccg_01")
        .single();
    if (error) throw new Error(error.message);
    return data as ExperimentQuotaSnapshot;
}

async function assertFinalSchemaEmpty(): Promise<void> {
    const supabase = createServiceClient();
    const { count, error } = await supabase
        .schema("exp_ccg_01_final")
        .from("sessions")
        .select("*", { count: "exact", head: true });
    if (error) throw new Error(`exp_ccg_01_final check: ${error.message}`);
    if ((count ?? 0) > 0) {
        throw new Error(
            "exp_ccg_01_final.sessions is not empty; truncate final tables or reset the preview DB before --finalize",
        );
    }
}

async function setupFinalizePreflight(mockCount: number): Promise<{
    restore: () => Promise<void>;
}> {
    const supabase = createServiceClient();
    const snapshot = await getExperimentSnapshot();

    const { error: updateErr } = await supabase
        .schema("experiments")
        .from("experiments")
        .update({
            quota: mockCount,
            participants_completed: mockCount,
            participants_in_progress: 0,
            last_quota_admission_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            admission_registration_interval: "1 second",
        })
        .eq("experiment_id", "exp_ccg_01");
    if (updateErr) throw new Error(`finalize preflight setup: ${updateErr.message}`);

    return {
        restore: async () => {
            const { error } = await supabase
                .schema("experiments")
                .from("experiments")
                .update({
                    quota: snapshot.quota,
                    participants_completed: snapshot.participants_completed,
                    participants_in_progress: snapshot.participants_in_progress,
                    last_quota_admission_at: snapshot.last_quota_admission_at,
                    admission_registration_interval: snapshot.admission_registration_interval,
                })
                .eq("experiment_id", "exp_ccg_01");
            if (error) console.warn("Failed to restore experiment quota:", error.message);
        },
    };
}

async function runFinalize(sessionIds: string[]): Promise<void> {
    console.warn(
        "\n⚠ --finalize: mutates exp_ccg_01_final and experiment quota counters. Use preview/local DB only.",
    );

    await assertFinalSchemaEmpty();

    const { restore } = await setupFinalizePreflight(sessionIds.length);

    try {
        const supabase = createServiceClient();
        const { data: success, error } = await supabase.schema("exp_ccg_01_final").rpc(
            "finalize_participant_sessions",
        );
        if (error) throw new Error(`finalize_participant_sessions: ${error.message}`);
        if (!success) {
            throw new Error(
                "finalize_participant_sessions returned false (preflight check failed)",
            );
        }

        console.log("  finalize_participant_sessions succeeded");

        for (const sessionId of sessionIds) {
            await assertFinalizedSession(sessionId);
        }
    } finally {
        await restore();
    }
}

async function assertFinalizedSession(sessionId: string): Promise<void> {
    const supabase = createServiceClient();

    const tables = ["sessions", "comprehension", "game_rounds", "survey"] as const;
    for (const table of tables) {
        const { count, error } = await supabase
            .schema("exp_ccg_01_final")
            .from(table)
            .select("*", { count: "exact", head: true })
            .eq("session_id", sessionId);
        if (error) throw new Error(`exp_ccg_01_final.${table}: ${error.message}`);
        if ((count ?? 0) === 0) {
            throw new Error(`exp_ccg_01_final.${table} has no rows for session ${sessionId}`);
        }
    }

    const { data: finalRounds, error: roundsErr } = await supabase
        .schema("exp_ccg_01_final")
        .from("game_rounds")
        .select("rid, matched_rid, coordination_score, target_θ")
        .eq("session_id", sessionId);
    if (roundsErr) throw new Error(roundsErr.message);

    const unscored = (finalRounds ?? []).filter(
        (r) => r.matched_rid == null || r.coordination_score == null || r.target_θ == null,
    );
    if (unscored.length > 0) {
        throw new Error(
            `exp_ccg_01_final.game_rounds: ${unscored.length} rounds missing match/score fields`,
        );
    }

    const { data: original, error: origErr } = await supabase
        .schema("exp_ccg_01")
        .from("sessions")
        .select("valid_record, total_points, validity_report")
        .eq("session_id", sessionId)
        .single();
    if (origErr) throw new Error(origErr.message);
    if (original.valid_record !== true) {
        throw new Error(
            `original session valid_record=${original.valid_record} after finalize\n${
                formatValidityReport(original.validity_report as Record<string, unknown>)
            }`,
        );
    }
    if (original.total_points == null) {
        throw new Error("original session total_points is null after finalize");
    }

    const { data: pred1, error: pred1Err } = await supabase.schema("exp_ccg_01_final").rpc(
        "score_game_predictions",
        { p_session_id: sessionId },
    );
    if (pred1Err) throw new Error(`score_game_predictions: ${pred1Err.message}`);
    const { data: pred2, error: pred2Err } = await supabase.schema("exp_ccg_01_final").rpc(
        "score_game_predictions",
        { p_session_id: sessionId },
    );
    if (pred2Err) throw new Error(`score_game_predictions (2): ${pred2Err.message}`);

    const points1 = (pred1 as { points: number }[])?.[0]?.points;
    const points2 = (pred2 as { points: number }[])?.[0]?.points;
    if (points1 !== points2) {
        throw new Error(`deterministic prediction scoring mismatch: ${points1} vs ${points2}`);
    }

    console.log(`  ✓ finalized session ${sessionId} (prediction_points=${points1})`);
}

async function runOneParticipant(
    index: number,
    registry: SessionRegistry,
): Promise<RegisteredSession> {
    const runId = Date.now();
    const pid = `${cliOptions.pidPrefix}-${runId}-${index}`;
    const platformSessionId = `${pid}-psid`;

    console.log(`\n[${index + 1}] Registering participant ${pid}…`);
    if (cliOptions.dryRun) {
        console.log("  (dry-run) skipping writes");
        return {
            authUserId: crypto.randomUUID(),
            sessionId: crypto.randomUUID(),
            email: `${pid}@test.local`,
            pid,
        };
    }

    const registered = await setupExperimentSession({
        pid,
        role: "participant",
        source: "mock-complete-participant",
        platform: cliOptions.platform,
        platformSessionId,
        registry,
    });

    console.log(`  session_id=${registered.sessionId}`);

    const expState = buildExpState(registered, cliOptions.platform);
    console.log(`  Comprehension (${COMPREHENSION_QIDS.length} questions)…`);
    await submitAllComprehension(registered.sessionId);

    const { client } = await signInParticipant(registered.email);
    const syncHandler = new SyncHandler("exp_ccg_01");
    const initErr = await syncHandler.initDb(client, registered.sessionId);
    if (initErr) throw new Error(`SyncHandler.initDb: ${initErr}`);

    console.log(`  Game (${cliOptions.rounds} rounds)…`);
    await playRecordedGame(expState, syncHandler, cliOptions.rounds);

    console.log("  Survey…");
    await submitSurvey(syncHandler);

    console.log("  Complete session…");
    await completeSession(registered.sessionId);

    console.log("  Assertions…");
    const validRecord = await assertCompletedSession(registered.sessionId, cliOptions.rounds);
    console.log(`  ✓ ${registered.pid} completed (valid_record=${validRecord})`);

    return registered;
}

async function main(): Promise<void> {
    cliOptions = parseCli();
    console.log("mock-complete-participant", cliOptions);

    if (cliOptions.dryRun) {
        console.log("Dry run complete (no database writes).");
        return;
    }

    const registry = new SessionRegistry();
    const completed: RegisteredSession[] = [];

    try {
        for (let i = 0; i < cliOptions.count; i++) {
            const registered = await runOneParticipant(i, registry);
            completed.push(registered);
        }

        const sessionIds = completed.map((s) => s.sessionId);

        if (cliOptions.strict || cliOptions.finalize) {
            await batchRescoreSessions(sessionIds);
            console.log("\nRe-asserting sessions after batch rescore…");
            for (const { sessionId, pid } of completed) {
                const validRecord = await assertCompletedSession(
                    sessionId,
                    cliOptions.rounds,
                    { strict: cliOptions.strict || cliOptions.finalize },
                );
                console.log(`  ✓ ${pid} strict check (valid_record=${validRecord})`);
            }
        }

        if (cliOptions.finalize) {
            await runFinalize(sessionIds);
        }

        console.log("\nAll mock participant sessions completed successfully.");

        if (cliOptions.noCleanup) {
            console.log("\nCreated sessions (left in DB):");
            for (const { pid, sessionId } of completed) {
                console.log(`  ${pid}  session_id=${sessionId}`);
            }
        }
    } finally {
        if (!cliOptions.noCleanup) {
            await registry.cleanupAll();
            console.log("Cleaned up created sessions (--cleanup).");
        } else {
            console.log("Leaving sessions in DB (default).");
        }
    }
}

main().catch((err) => {
    console.error(err);
    Deno.exit(1);
});
