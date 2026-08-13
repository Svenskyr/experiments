DROP FUNCTION IF EXISTS exp_ccg_01_final.score_game_prediction(UUID);

CREATE OR REPLACE FUNCTION exp_ccg_01_final.score_game_predictions(p_session_id UUID)
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
                WHEN experiments.deterministic_uniform_random('prediction:' || rid)
                < GREATEST(0, 0.1 - (target_θ - choice_option_1_prediction)^2) THEN 10
                ELSE 0
            END
        ), 480))::INTEGER
    FROM exp_ccg_01_final.game_rounds
    WHERE session_id = p_session_id;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.score_game_predictions(UUID) FROM PUBLIC;