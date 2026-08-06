CREATE OR REPLACE FUNCTION exp_ccg_01.score_and_validate_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01, experiments
AS $$
DECLARE
    v_valid BOOLEAN;
    v_validity_report JSONB;
    v_completion RECORD;
    v_comprehension RECORD;
    v_game_rounds RECORD;
    v_predictions RECORD;
    v_survey RECORD;
BEGIN
    SELECT * INTO v_completion FROM exp_ccg_01.score_completion(p_session_id);
    SELECT * INTO v_comprehension FROM exp_ccg_01.score_comprehension(p_session_id);
    SELECT * INTO v_game_rounds FROM exp_ccg_01.score_coordinations(p_session_id);
    SELECT * INTO v_predictions FROM exp_ccg_01.score_predictions(p_session_id);
    SELECT * INTO v_survey FROM exp_ccg_01.validate_survey(p_session_id);

    v_valid := v_completion.points > 0
        AND v_comprehension.scored_count = v_comprehension.total_count
        AND v_game_rounds.scored_count = v_game_rounds.total_count
        AND v_predictions.scored_count = v_predictions.total_count
        AND v_survey.count > 0;

    v_validity_report := jsonb_build_object(
        'valid', v_valid,
        'timestamp', now(),
        'modules', jsonb_build_object(
            'completion', jsonb_build_object(
                'status', v_completion.status,
                'points', v_completion.points
            ),
            'comprehension', jsonb_build_object(
                'scored', v_comprehension.scored_count,
                'count', v_comprehension.total_count,
                'points', v_comprehension.points
            ),
            'game_rounds', jsonb_build_object(
                'scored', v_game_rounds.scored_count,
                'count', v_game_rounds.total_count,
                'points', v_game_rounds.points
            ),
            'predictions', jsonb_build_object(
                'scored', v_predictions.scored_count,
                'count', v_predictions.total_count,
                'points', v_predictions.points
            ),
            'survey', jsonb_build_object(
                'count', v_survey.count
            )
        )
    );

    UPDATE exp_ccg_01.sessions
    SET
        completion_points = v_completion.points,
        comprehension_points = v_comprehension.points,
        game_coordination_points = v_game_rounds.points,
        game_prediction_points = v_predictions.points,
        total_points = v_completion.points
            + v_comprehension.points
            + v_game_rounds.points
            + v_predictions.points,
        valid_record = v_valid,
        validity_report = v_validity_report
    WHERE exp_ccg_01.sessions.session_id = p_session_id;

    RETURN v_validity_report;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.score_and_validate_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.score_and_validate_session(UUID) TO service_role;
