CREATE OR REPLACE FUNCTION exp_ccg_01.score_predictions(p_session_id UUID)
RETURNS TABLE (total_count INTEGER, scored_count INTEGER, points INTEGER)
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01, experiments
AS $$
    -- Sum of per-round lottery points for this session.
    -- prediction_mse: (θ - x)^2
    -- Each round: win 0 or 10 points via binarized lottery
    -- Base win probability is 0.1 (10%), reduced by prediction_mse
    -- Constrained between 0 and 480 points (max for participants; $0-$4.80)
    -- If any prediction_mse is null, then return null (actually returns 0).
    SELECT
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN target_θ IS NOT NULL THEN 1 END)::INTEGER,
        LEAST(GREATEST(SUM(
            CASE
                WHEN experiments.deterministic_uniform_random('prediction:' || rid)
                < GREATEST(0, 0.1 - (target_θ - choice_option_1_prediction)^2) THEN 10
                ELSE 0
            END
        ), 0), 480)::INTEGER
    FROM exp_ccg_01.game_rounds
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_predictions(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_predictions(UUID) TO service_role;