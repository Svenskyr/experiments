CREATE OR REPLACE FUNCTION exp_ccg_01.score_comprehension(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    -- Sum of earned scores as a percent of sum of max possible per row (0–100 points, $0–$1)
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN score IS NOT NULL THEN 1 END)::INTEGER,
        GREATEST(0, LEAST(
            ROUND(100.0 * SUM(score) / NULLIF(SUM(max_possible_score), 0)),
            100
        ))::INTEGER
    FROM exp_ccg_01.comprehension
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_comprehension(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_comprehension(UUID) TO service_role;


CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_comprehension(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01_final
AS $$
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN score IS NOT NULL THEN 1 END)::INTEGER,
        GREATEST(0, LEAST(
            ROUND(100.0 * SUM(score) / NULLIF(SUM(max_possible_score), 0)),
            100
        ))::INTEGER
    FROM exp_ccg_01_final.comprehension
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_comprehension(UUID) FROM PUBLIC;


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
        score,
        max_possible_score
    )
    SELECT
        source.session_id,
        source.qid,
        source.question_text,
        source.responses,
        source.score,
        source.max_possible_score
    FROM exp_ccg_01.comprehension AS source
    JOIN exp_ccg_01_final.sessions AS final_session
        ON final_session.session_id = source.session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.copy_comprehension() FROM PUBLIC;


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
            GREATEST(0, LEAST(
                ROUND(100.0 * SUM(score) / NULLIF(SUM(max_possible_score), 0)),
                100
            ))::INTEGER AS points
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
                    WHEN experiments.deterministic_uniform_random('prediction:' || rid)
                    < GREATEST(0, 0.1 - (target_θ - choice_option_1_prediction)^2) THEN 10
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
