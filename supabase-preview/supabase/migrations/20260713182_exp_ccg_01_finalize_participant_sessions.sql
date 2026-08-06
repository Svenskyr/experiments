CREATE SCHEMA IF NOT EXISTS exp_ccg_01_final;
CREATE TABLE IF NOT EXISTS exp_ccg_01_final.sessions (
    session_id UUID PRIMARY KEY REFERENCES experiments.sessions(session_id),
    user_id UUID NOT NULL REFERENCES experiments.users(user_id),
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    platform TEXT NOT NULL,
    platform_session_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auth_id UUID NOT NULL,
    completion_points INTEGER,
    comprehension_points INTEGER,
    game_coordination_points INTEGER,
    game_prediction_points INTEGER,
    total_points INTEGER,
    attention_check_correct BOOLEAN,
    page_time_record JSONB,
    valid_record BOOLEAN,
    validity_report JSONB
);
CREATE TABLE IF NOT EXISTS exp_ccg_01_final.comprehension (LIKE exp_ccg_01.comprehension INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS exp_ccg_01_final.game_rounds (LIKE exp_ccg_01.game_rounds INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS exp_ccg_01_final.game_stats (LIKE exp_ccg_01.game_stats INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS exp_ccg_01_final.survey (LIKE exp_ccg_01.survey INCLUDING INDEXES);

CREATE INDEX idx_for_round_matching ON exp_ccg_01_final.game_rounds
    (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2)
    INCLUDE (rid, session_id, player_1_chose, choice_option_1_prediction);


CREATE OR REPLACE FUNCTION exp_ccg_01_final.preflight_check()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final, experiments
AS $$
DECLARE
    v_experiment experiments.experiments;
BEGIN
    SELECT * INTO v_experiment
    FROM experiments.experiments
    WHERE experiment_id = 'exp_ccg_01';

    IF (
        v_experiment.participants_completed < v_experiment.quota -- quota not yet reached
        OR v_experiment.participants_in_progress > 0 -- some participants are still in progress
        OR now() < v_experiment.last_quota_admission_at + v_experiment.admission_registration_interval -- admission 🠖 registration interval not yet elapsed
        OR EXISTS (
            SELECT 1 FROM exp_ccg_01_final.sessions -- sessions already finalized
        )
    ) THEN RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.preflight_check() FROM PUBLIC;

CREATE OR REPLACE FUNCTION exp_ccg_01_final.finalize_participant_sessions()
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final, experiments
AS $$
BEGIN
    IF NOT exp_ccg_01_final.preflight_check() THEN
        RETURN FALSE;
    END IF;

    PERFORM exp_ccg_01_final.copy_sessions();
    PERFORM exp_ccg_01_final.copy_comprehension();
    PERFORM exp_ccg_01_final.copy_game_rounds();
    PERFORM exp_ccg_01_final.copy_survey();
    PERFORM exp_ccg_01_final.match_game_rounds();
    PERFORM exp_ccg_01_final.calculate_game_stats();
    PERFORM exp_ccg_01_final.update_target_θ();
    PERFORM exp_ccg_01_final.score_and_validate_final_sessions();
    PERFORM exp_ccg_01_final.update_original_sessions();

    RETURN TRUE;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.finalize_participant_sessions() FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01_final.finalize_participant_sessions() TO service_role;

CREATE OR REPLACE FUNCTION exp_ccg_01_final.copy_sessions()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final, experiments
AS $$
    INSERT INTO exp_ccg_01_final.sessions (
        session_id,
        user_id,
        role,
        status,
        platform,
        platform_session_id,
        started_at,
        last_active_at,
        completed_at,
        updated_at,
        auth_id,
        completion_points,
        comprehension_points,
        game_coordination_points,
        game_prediction_points,
        total_points,
        attention_check_correct,
        page_time_record,
        valid_record,
        validity_report
    )
    SELECT
        lifecycle.session_id,
        lifecycle.user_id,
        lifecycle.role,
        lifecycle.status,
        COALESCE(lifecycle.platform, exp_user.platform, ''),
        COALESCE(lifecycle.platform_session_id, ''),
        lifecycle.started_at,
        lifecycle.last_active_at,
        lifecycle.completed_at,
        lifecycle.updated_at,
        COALESCE(lifecycle.auth_id, session_auth.auth_id),
        exp_session.completion_points,
        exp_session.comprehension_points,
        exp_session.game_coordination_points,
        exp_session.game_prediction_points,
        exp_session.total_points,
        exp_session.attention_check_correct,
        exp_session.page_time_record,
        exp_session.valid_record,
        exp_session.validity_report
    FROM experiments.sessions AS lifecycle
    JOIN exp_ccg_01.sessions AS exp_session
        ON exp_session.session_id = lifecycle.session_id
    JOIN experiments.users AS exp_user
        ON exp_user.user_id = lifecycle.user_id
    LEFT JOIN exp_ccg_01.session_auth_ids AS session_auth
        ON session_auth.session_id = lifecycle.session_id
        AND session_auth.replaced_at IS NULL
    WHERE lifecycle.experiment_id = 'exp_ccg_01'
        AND lifecycle.role = 'participant'
        AND lifecycle.status = 'completed';
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.copy_sessions() FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.copy_comprehension()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final
AS $$
    INSERT INTO exp_ccg_01_final.comprehension (
        session_id,
        qid,
        question_text,
        responses,
        score
    )
    SELECT
        source.session_id,
        source.qid,
        source.question_text,
        source.responses,
        source.score
    FROM exp_ccg_01.comprehension AS source
    JOIN exp_ccg_01_final.sessions AS final_session
        ON final_session.session_id = source.session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.copy_comprehension() FROM PUBLIC;

CREATE OR REPLACE FUNCTION exp_ccg_01_final.copy_game_rounds()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final
AS $$
    -- Copy over the necessary fields from exp_ccg_01.game_rounds (where session_id is in exp_ccg_01_final.sessions)
    INSERT INTO exp_ccg_01_final.game_rounds (
        rid,
        session_id,
        player_1_role,
        local_round_number,
        player_1_avatar,
        player_2_avatar,
        choice_option_1,
        choice_option_2,
        player_1_chose,
        choice_option_1_prediction,
        time_elapsed_seconds,
        inserted_at
    )
    SELECT
        source.rid,
        source.session_id,
        source.player_1_role,
        source.local_round_number,
        source.player_1_avatar,
        source.player_2_avatar,
        source.choice_option_1,
        source.choice_option_2,
        source.player_1_chose,
        source.choice_option_1_prediction,
        source.time_elapsed_seconds,
        source.inserted_at
    FROM exp_ccg_01.game_rounds AS source
    JOIN exp_ccg_01_final.sessions AS final_session
        ON final_session.session_id = source.session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.copy_game_rounds() FROM PUBLIC;

CREATE OR REPLACE FUNCTION exp_ccg_01_final.copy_survey()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final
AS $$
    -- Copy over the necessary fields from exp_ccg_01.survey (where session_id is in exp_ccg_01_final.sessions)
    INSERT INTO exp_ccg_01_final.survey (
        session_id,
        qid,
        question_text,
        question_type,
        responses
    )
    SELECT
        source.session_id,
        source.qid,
        source.question_text,
        source.question_type,
        source.responses
    FROM exp_ccg_01.survey AS source
    JOIN exp_ccg_01_final.sessions AS final_session
        ON final_session.session_id = source.session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.copy_survey() FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.match_game_rounds()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final
AS $$
    -- Mirror signature + per-seeker random pick (same as exp_ccg_01.find_matching_round).
    WITH picked AS (
        SELECT
            seeker.rid AS seeker_rid,
            seeker.player_1_chose AS seeker_player_1_chose,
            seeker.choice_option_1,
            seeker.choice_option_2,
            match_round.rid AS match_rid,
            match_round.player_1_chose,
            ROW_NUMBER() OVER (PARTITION BY seeker.rid ORDER BY random()) AS rn
        FROM exp_ccg_01_final.game_rounds AS seeker
        JOIN exp_ccg_01_final.game_rounds AS match_round
            ON match_round.player_1_avatar = seeker.player_2_avatar
            AND match_round.player_2_avatar = seeker.player_1_avatar
            AND match_round.choice_option_1 = seeker.choice_option_2
            AND match_round.choice_option_2 = seeker.choice_option_1
            AND match_round.session_id != seeker.session_id
            AND match_round.player_1_role = 'participant'
    )
    UPDATE exp_ccg_01_final.game_rounds AS gr
    SET
        matched_rid = picked.match_rid,
        matched_at = now(),
        player_2_chose = picked.player_1_chose,
        coordination_outcome = CASE
            WHEN picked.seeker_player_1_chose = picked.player_1_chose THEN
                'coordinated on: ' || picked.seeker_player_1_chose ||
                CASE
                    WHEN picked.seeker_player_1_chose = picked.choice_option_1 THEN ' (choice_1)'
                    ELSE ' (choice_2)'
                END
            ELSE 'no coordination'
        END,
        coordination_score = CASE
            WHEN picked.seeker_player_1_chose = picked.player_1_chose THEN
                CASE
                    WHEN picked.seeker_player_1_chose = picked.choice_option_1 THEN 2
                    ELSE 1
                END
            ELSE 0
        END
    FROM picked
    WHERE gr.rid = picked.seeker_rid
        AND picked.rn = 1;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.match_game_rounds() FROM PUBLIC;


-- CREATE OR REPLACE FUNCTION exp_ccg_01_final.calculate_game_stats()
-- RETURNS VOID
-- LANGUAGE sql
-- VOLATILE
-- SECURITY INVOKER
-- SET search_path = exp_ccg_01_final
-- AS $$
--     INSERT INTO exp_ccg_01_final.game_stats (
--         player_1_avatar,
--         player_2_avatar,
--         choice_option_1,
--         choice_option_2,
--         total_count,
--         count_player_1_chose_option_1,
--         θ,
--         θ_mean_prediction
--     )
--     SELECT
--         r.player_1_avatar,
--         r.player_2_avatar,
--         r.choice_option_1,
--         r.choice_option_2,
--         COUNT(*)::INTEGER,
--         COUNT(*) FILTER (WHERE r.player_1_chose = r.choice_option_2)::INTEGER,
--         COUNT(*) FILTER (WHERE r.player_1_chose = r.choice_option_2)::REAL / COUNT(*)::REAL,
--         (SELECT AVG(choice_option_1_prediction)
--         FROM exp_ccg_01_final.game_rounds AS mirror
--         WHERE mirror.player_1_avatar = r.player_2_avatar
--         AND mirror.player_2_avatar = r.player_1_avatar
--         AND mirror.choice_option_1 = r.choice_option_2
--         AND mirror.choice_option_2 = r.choice_option_1)::REAL
--     FROM exp_ccg_01_final.game_rounds AS r
--     GROUP BY
--         r.player_1_avatar,
--         r.player_2_avatar,
--         r.choice_option_1,
--         r.choice_option_2
--     ON CONFLICT (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2) DO UPDATE SET
--         total_count = EXCLUDED.total_count,
--         count_player_1_chose_option_2 = EXCLUDED.count_player_1_chose_option_2,
--         θ = EXCLUDED.θ,
--         θ_mean_prediction = EXCLUDED.θ_mean_prediction,
--         updated_at = now();
-- $$;
-- REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.calculate_game_stats() FROM PUBLIC;


-- CREATE OR REPLACE FUNCTION exp_ccg_01_final.calculate_game_stats()
-- RETURNS VOID
-- LANGUAGE sql
-- VOLATILE
-- SECURITY INVOKER
-- SET search_path = exp_ccg_01_final
-- AS $$
--     WITH round_stats AS (
--         SELECT
--             r.player_1_avatar,
--             r.player_2_avatar,
--             r.choice_option_1,
--             r.choice_option_2,
--             COUNT(*)::INTEGER AS total_count,
--             COUNT(*) FILTER (WHERE r.player_1_chose = r.choice_option_2)::INTEGER AS count_player_1_chose_option_2,
--             COUNT(*) FILTER (WHERE r.player_1_chose = r.choice_option_2)::REAL / COUNT(*)::REAL AS θ
--         FROM exp_ccg_01_final.game_rounds AS r
--         GROUP BY 1, 2, 3, 4
--     ),
--     prediction_by_signature AS (
--         SELECT
--             sig.player_1_avatar,
--             sig.player_2_avatar,
--             sig.choice_option_1,
--             sig.choice_option_2,
--             AVG(choice_option_1_prediction)::REAL AS θ_mean_prediction
--         FROM exp_ccg_01_final.game_rounds AS sig
--         GROUP BY 1, 2, 3, 4
--     )
--     INSERT INTO exp_ccg_01_final.game_stats (
--         player_1_avatar,
--         player_2_avatar,
--         choice_option_1,
--         choice_option_2,
--         total_count,
--         count_player_1_chose_option_2,
--         θ,
--         θ_mean_prediction,
--         updated_at
--     )
--     SELECT
--         stats.player_1_avatar,
--         stats.player_2_avatar,
--         stats.choice_option_1,
--         stats.choice_option_2,
--         stats.total_count,
--         stats.count_player_1_chose_option_2,
--         stats.θ,
--         p.θ_mean_prediction,
--         now()
--     FROM round_stats AS stats
--     LEFT JOIN prediction_by_signature AS p
--         ON p.player_1_avatar = stats.player_2_avatar
--         AND p.player_2_avatar = stats.player_1_avatar
--         AND p.choice_option_1 = stats.choice_option_2
--         AND p.choice_option_2 = stats.choice_option_1
--     ON CONFLICT (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2) DO UPDATE SET
--         total_count = EXCLUDED.total_count,
--         count_player_1_chose_option_2 = EXCLUDED.count_player_1_chose_option_2,
--         θ = EXCLUDED.θ,
--         θ_mean_prediction = EXCLUDED.θ_mean_prediction,
--         updated_at = now();
-- $$;
-- REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.calculate_game_stats() FROM PUBLIC;




CREATE OR REPLACE FUNCTION exp_ccg_01_final.calculate_game_stats()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    WITH direct_stats AS (
        SELECT
            player_1_avatar,
            player_2_avatar,
            choice_option_1,
            choice_option_2,
            COUNT(*)::INTEGER AS total_count,
            COUNT(*) FILTER (WHERE player_1_chose = choice_option_2)::INTEGER AS count_player_1_chose_option_2,
            AVG(choice_option_1_prediction)::REAL AS direct_mean_prediction
        FROM exp_ccg_01_final.game_rounds
        WHERE player_1_role = 'participant'
        GROUP BY 1, 2, 3, 4
    ),
    new_data AS (
        SELECT
            s.player_1_avatar,
            s.player_2_avatar,
            s.choice_option_1,
            s.choice_option_2,
            s.total_count,
            s.count_player_1_chose_option_2,
            p.direct_mean_prediction AS θ_mean_prediction
        FROM direct_stats AS s
        LEFT JOIN direct_stats AS p
            ON p.player_1_avatar = s.player_2_avatar
            AND p.player_2_avatar = s.player_1_avatar
            AND p.choice_option_1 = s.choice_option_2
            AND p.choice_option_2 = s.choice_option_1
    )
    INSERT INTO exp_ccg_01_final.game_stats (
        player_1_avatar,
        player_2_avatar,
        choice_option_1,
        choice_option_2,
        total_count,
        count_player_1_chose_option_2,
        θ,
        θ_mean_prediction,
        updated_at
    )
    SELECT
        new.player_1_avatar,
        new.player_2_avatar,
        new.choice_option_1,
        new.choice_option_2,
        new.total_count,
        new.count_player_1_chose_option_2,
        (new.count_player_1_chose_option_2)::REAL / (new.total_count)::REAL,
        new.θ_mean_prediction,
        now()
    FROM new_data AS new
    ON CONFLICT (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2) DO UPDATE SET
        total_count = EXCLUDED.total_count,
        count_player_1_chose_option_2 = EXCLUDED.count_player_1_chose_option_2,
        θ = EXCLUDED.θ,
        θ_mean_prediction = EXCLUDED.θ_mean_prediction,
        updated_at = now();
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.calculate_game_stats() FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.update_target_θ()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final
AS $$
    -- -- Update the target_θ for each game_rounds record
    -- UPDATE exp_ccg_01_final.game_rounds AS gr
    -- SET
    --     target_θ = 
    --         SELECT (
    --                 (stats.count_player_1_chose_option_2 - SELECT (
    --                     COUNT(*) FILTER (WHERE player_1_chose = choice_option_2)
    --                     FROM exp_ccg_01_final.game_rounds
    --                     WHERE session_id = gr.session_id
    --                     AND player_1_avatar = gr.player_2_avatar
    --                     AND player_2_avatar = gr.player_1_avatar
    --                     AND choice_option_1 = gr.choice_option_2
    --                     AND choice_option_2 = gr.choice_option_1
    --                 ))::REAL / NULLIF((stats.total_count - SELECT (
    --                     COUNT(*)
    --                     FROM exp_ccg_01_final.game_rounds
    --                     WHERE session_id = gr.session_id
    --                     AND player_1_avatar = gr.player_2_avatar
    --                     AND player_2_avatar = gr.player_1_avatar
    --                     AND choice_option_1 = gr.choice_option_2
    --                     AND choice_option_2 = gr.choice_option_1
    --                 ))::REAL, 0)
    --         ) FROM exp_ccg_01_final.game_stats AS stats
    --         WHERE stats.player_1_avatar = gr.player_2_avatar
    --         AND stats.player_2_avatar = gr.player_1_avatar
    --         AND stats.choice_option_1 = gr.choice_option_2
    --         AND stats.choice_option_2 = gr.choice_option_1;

    WITH self_mirror AS (
        SELECT
            sm.session_id,
            sm.player_1_avatar,
            sm.player_2_avatar,
            sm.choice_option_1,
            sm.choice_option_2,
            COUNT(*) AS total_count,
            COUNT(*) FILTER (WHERE sm.player_1_chose = sm.choice_option_2) AS chose_option_2
        FROM exp_ccg_01_final.game_rounds AS sm
        GROUP BY 1, 2, 3, 4, 5
    ),
    round_target AS (
        SELECT
            gr.rid,
            (
                (stats.count_player_1_chose_option_2 - COALESCE(sm.chose_option_2, 0))::REAL
                / NULLIF((stats.total_count - COALESCE(sm.total_count, 0))::REAL, 0)
            ) AS target_θ
        FROM exp_ccg_01_final.game_rounds AS gr
        JOIN exp_ccg_01_final.game_stats AS stats
        ON stats.player_1_avatar = gr.player_2_avatar
        AND stats.player_2_avatar = gr.player_1_avatar
        AND stats.choice_option_1 = gr.choice_option_2
        AND stats.choice_option_2 = gr.choice_option_1
        LEFT JOIN self_mirror AS sm
        ON sm.session_id = gr.session_id
        AND sm.player_1_avatar = gr.player_2_avatar
        AND sm.player_2_avatar = gr.player_1_avatar
        AND sm.choice_option_1 = gr.choice_option_2
        AND sm.choice_option_2 = gr.choice_option_1
    )
    UPDATE exp_ccg_01_final.game_rounds AS gr
    SET
        target_θ = round_target.target_θ
    FROM round_target
    WHERE gr.rid = round_target.rid;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.update_target_θ() FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_completion(p_session_id UUID)
RETURNS TABLE (status TEXT, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    SELECT 'final' AS status, 200 AS points;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_completion(UUID) FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_comprehension(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    -- Average score of all comprehension records for this session,
    -- Converted to an integer at a rate of 1 avg score 🠖 100 points
    -- Constrained between 0 and 100 points ($0-$1)
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN score IS NOT NULL THEN 1 END)::INTEGER,
        GREATEST(0, LEAST(AVG(score) * 100, 100))::INTEGER
    FROM exp_ccg_01_final.comprehension
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_comprehension(UUID) FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_game_coordination(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN coordination_score IS NOT NULL THEN 1 END)::INTEGER,
        GREATEST(0, LEAST(SUM(coordination_score) * 5, 480))::INTEGER
    FROM exp_ccg_01_final.game_rounds
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_game_coordination(UUID) FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_game_prediction(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN target_θ IS NOT NULL THEN 1 END)::INTEGER,
        GREATEST(0, LEAST(SUM(
            CASE
                WHEN RANDOM() < GREATEST(0, 0.1 - (target_θ - choice_option_1_prediction)^2) THEN 10
                ELSE 0
            END
        ), 480))::INTEGER
    FROM exp_ccg_01.game_rounds
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_game_prediction(UUID) FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.validate_survey(p_session_id UUID)
RETURNS TABLE (count INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    SELECT COUNT(*)::INTEGER
    FROM exp_ccg_01_final.survey
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.validate_survey(UUID) FROM PUBLIC;



CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_and_validate_final_sessions()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    WITH comprehension AS (
        SELECT
            session_id,
            COUNT(*)::INTEGER AS total_count,
            COUNT(*) FILTER (WHERE score IS NOT NULL)::INTEGER AS scored_count,
            GREATEST(0, LEAST(AVG(score) * 100, 100))::INTEGER AS points
        FROM exp_ccg_01_final.comprehension
        GROUP BY session_id
    ),
    coordination AS (
        SELECT
            session_id,
            COUNT(*)::INTEGER AS total_count,
            COUNT(*) FILTER (WHERE coordination_score IS NOT NULL)::INTEGER AS scored_count,
            GREATEST(0, LEAST(SUM(coordination_score) * 5, 480))::INTEGER AS points
        FROM exp_ccg_01_final.game_rounds
        GROUP BY session_id
    ),
    prediction AS (
        SELECT
            session_id,
            COUNT(*)::INTEGER AS total_count,
            COUNT(*) FILTER (WHERE target_θ IS NOT NULL)::INTEGER AS scored_count,
            GREATEST(0, LEAST(SUM(
                CASE
                    WHEN RANDOM() < GREATEST(0, 0.1 - (target_θ - choice_option_1_prediction)^2) THEN 10
                    ELSE 0
                END
            ), 480))::INTEGER AS points
        FROM exp_ccg_01_final.game_rounds
        GROUP BY session_id
    ),
    survey AS (
        SELECT
            session_id,
            COUNT(*)::INTEGER AS count
        FROM exp_ccg_01_final.survey
        GROUP BY session_id
    ),
    scored AS (
        SELECT
            s.session_id,
            c.points AS completion_points,
            comp.points AS comprehension_points,
            coord.points AS game_coordination_points,
            pred.points AS game_prediction_points,
            c.points + comp.points + coord.points + pred.points AS total_points,
            (
                c.status = 'final'
                AND COALESCE(comp.scored_count, 0) = COALESCE(comp.total_count, 0)
                AND COALESCE(coord.scored_count, 0) = COALESCE(coord.total_count, 0)
                AND COALESCE(pred.scored_count, 0) = COALESCE(pred.total_count, 0)
                AND COALESCE(survey.count, 0) > 0
            ) AS valid_record,
            jsonb_build_object(
                'valid',
                (
                    c.status = 'final'
                    AND COALESCE(comp.scored_count, 0) = COALESCE(comp.total_count, 0)
                    AND COALESCE(coord.scored_count, 0) = COALESCE(coord.total_count, 0)
                    AND COALESCE(pred.scored_count, 0) = COALESCE(pred.total_count, 0)
                    AND COALESCE(survey.count, 0) > 0
                ),
                'timestamp', now(),
                'modules', jsonb_build_object(
                    'completion', jsonb_build_object(
                        'status', c.status,
                        'points', c.points
                    ),
                    'comprehension', jsonb_build_object(
                        'scored', COALESCE(comp.scored_count, 0),
                        'count', COALESCE(comp.total_count, 0),
                        'points', comp.points
                    ),
                    'game_rounds', jsonb_build_object(
                        'scored', COALESCE(coord.scored_count, 0),
                        'count', COALESCE(coord.total_count, 0),
                        'points', coord.points
                    ),
                    'predictions', jsonb_build_object(
                        'scored', COALESCE(pred.scored_count, 0),
                        'count', COALESCE(pred.total_count, 0),
                        'points', pred.points
                    ),
                    'survey', jsonb_build_object(
                        'count', COALESCE(survey.count, 0)
                    )
                )
            ) AS validity_report
        FROM exp_ccg_01_final.sessions AS s
        JOIN LATERAL exp_ccg_01_final.score_completion(s.session_id) AS c ON TRUE
        LEFT JOIN comprehension AS comp ON comp.session_id = s.session_id
        LEFT JOIN coordination AS coord ON coord.session_id = s.session_id
        LEFT JOIN prediction AS pred ON pred.session_id = s.session_id
        LEFT JOIN survey AS survey ON survey.session_id = s.session_id
    )
    UPDATE exp_ccg_01_final.sessions AS sess
    SET
        completion_points = scored.completion_points,
        comprehension_points = scored.comprehension_points,
        game_coordination_points = scored.game_coordination_points,
        game_prediction_points = scored.game_prediction_points,
        total_points = scored.total_points,
        valid_record = scored.valid_record,
        validity_report = scored.validity_report
    FROM scored
    WHERE sess.session_id = scored.session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_and_validate_final_sessions() FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.update_original_sessions()
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final
AS $$
BEGIN
    UPDATE exp_ccg_01.sessions AS orig
    SET
        completion_points = final.completion_points,
        comprehension_points = final.comprehension_points,
        game_coordination_points = final.game_coordination_points,
        game_prediction_points = final.game_prediction_points,
        total_points = final.total_points,
        valid_record = final.valid_record,
        validity_report = final.validity_report
    FROM exp_ccg_01_final.sessions AS final
    WHERE orig.session_id = final.session_id;

    UPDATE exp_ccg_01.game_rounds AS orig
    SET
        player_2_chose = final.player_2_chose,
        coordination_outcome = final.coordination_outcome,
        coordination_score = final.coordination_score,
        target_θ = final.target_θ,
        matched_at = final.matched_at,
        matched_rid = final.matched_rid
    FROM exp_ccg_01_final.game_rounds AS final
    WHERE orig.rid = final.rid
        AND orig.session_id = final.session_id
        AND final.player_1_role = 'participant';
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.update_original_sessions() FROM PUBLIC;


CREATE OR REPLACE FUNCTION exp_ccg_01.rescore_non_participant_sessions()
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, experiments
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    PERFORM exp_ccg_01.rescan_game_stats();

    FOR v_session_id IN
        SELECT lifecycle.session_id
        FROM experiments.sessions AS lifecycle
        WHERE lifecycle.experiment_id = 'exp_ccg_01'
            AND lifecycle.role != 'participant'
            AND lifecycle.status = 'completed'
    LOOP
        PERFORM exp_ccg_01.synthesize_game_round_outcomes(v_session_id, TRUE);
        PERFORM exp_ccg_01.score_and_validate_session(v_session_id);
    END LOOP;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.rescore_non_participant_sessions() FROM PUBLIC;


-- Called by pg_cron when participant quota is filled. Runs finalize once preflight passes,
-- then unschedules this job.
CREATE OR REPLACE FUNCTION exp_ccg_01_final.finalize_participant_sessions_scheduled()
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = exp_ccg_01, exp_ccg_01_final, experiments, cron
AS $$
DECLARE
    v_success BOOLEAN;
BEGIN
    CALL experiments.sweep_expired_sessions();
    v_success := exp_ccg_01_final.finalize_participant_sessions();
    IF v_success THEN
        PERFORM exp_ccg_01.rescore_non_participant_sessions();
        PERFORM cron.unschedule(jobid)
        FROM cron.job
        WHERE jobname = 'exp_ccg_01-attempt-finalize-participant-sessions';
    END IF;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.finalize_participant_sessions_scheduled() FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01_final.finalize_participant_sessions_scheduled() TO service_role;
