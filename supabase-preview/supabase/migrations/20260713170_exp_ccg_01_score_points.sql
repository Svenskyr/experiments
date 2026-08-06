CREATE OR REPLACE FUNCTION exp_ccg_01.score_completion(p_session_id UUID)
RETURNS TABLE (status TEXT, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01, experiments
AS $$
    SELECT
        status,
        CASE WHEN completed_at IS NOT NULL THEN 200 ELSE 0 END
    FROM experiments.sessions
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_completion(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_completion(UUID) TO service_role;


CREATE OR REPLACE FUNCTION exp_ccg_01.score_comprehension(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    -- Average score of all comprehension records for this session,
    -- Converted to an integer at a rate of 1 avg score 🠖 100 points
    -- Constrained between 0 and 100 points ($0-$1)
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN score IS NOT NULL THEN 1 END)::INTEGER,
        LEAST(GREATEST(AVG(score) * 100, 0), 100)::INTEGER
    FROM exp_ccg_01.comprehension
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_comprehension(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_comprehension(UUID) TO service_role;


CREATE OR REPLACE FUNCTION exp_ccg_01.score_coordinations(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    -- Sum of all coordination scores for this session,
    -- Converted to an integer at a rate of 1 score 🠖 5 points
    -- Constrained between 0 and 480 points (max for participants; $0-$4.80)
    -- If any coordination score is null, then return null.
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN coordination_score IS NOT NULL THEN 1 END)::INTEGER,
        LEAST(GREATEST(SUM(coordination_score) * 5, 0), 480)::INTEGER
    FROM exp_ccg_01.game_rounds
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_coordinations(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_coordinations(UUID) TO service_role;


CREATE OR REPLACE FUNCTION exp_ccg_01.score_predictions(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    -- Sum of per-round lottery points for this session.
    -- prediction_mse: (θ - x)^2
    -- Each round: win 0 or 10 points via binarized lottery
    -- Base win probability is 0.1 (10%), reduced by prediction_mse
    -- Constrained between 0 and 480 points (max for participants; $0-$4.80)
    -- If any prediction_mse is null, then return null.
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN target_θ IS NOT NULL THEN 1 END)::INTEGER,
        LEAST(GREATEST(SUM(
            CASE
                WHEN RANDOM() < GREATEST(0, 0.1 - (target_θ - choice_option_1_prediction)^2) THEN 10
                ELSE 0
            END
        ), 0), 480)::INTEGER
    FROM exp_ccg_01.game_rounds
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_predictions(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_predictions(UUID) TO service_role;


CREATE OR REPLACE FUNCTION exp_ccg_01.validate_survey(p_session_id UUID)
RETURNS TABLE (count INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    SELECT COUNT(*)::INTEGER
    FROM exp_ccg_01.survey
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.validate_survey(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.validate_survey(UUID) TO service_role;
