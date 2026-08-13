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