CREATE OR REPLACE FUNCTION exp_ccg_01.complete_experiment_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = exp_ccg_01, experiments
AS $$
DECLARE
    v_role TEXT;
    v_experiment_id TEXT;
    v_rows INTEGER;
BEGIN
    SELECT role, experiment_id
    INTO v_role, v_experiment_id
    FROM experiments.sessions
    WHERE experiments.sessions.session_id = p_session_id;

    UPDATE experiments.sessions
    SET
        status = 'completed',
        completed_at = COALESCE(experiments.sessions.completed_at, now()),
        updated_at = now()
    WHERE experiments.sessions.session_id = p_session_id
      AND experiments.sessions.status = 'in_progress';

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
        UPDATE experiments.experiments
        SET
            sessions_in_progress = sessions_in_progress - 1,
            sessions_completed = sessions_completed + 1,
            participants_in_progress = participants_in_progress - CASE WHEN v_role = 'participant' THEN 1 ELSE 0 END,
            participants_completed = participants_completed + CASE WHEN v_role = 'participant' THEN 1 ELSE 0 END
        WHERE experiments.experiments.experiment_id = v_experiment_id;
    END IF;

    BEGIN
    PERFORM exp_ccg_01.synthesize_game_round_outcomes(p_session_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'synthesize_game_round_outcomes failed for session %: %', p_session_id, SQLERRM;
    END;
    BEGIN
    PERFORM exp_ccg_01.add_session_to_game_stats(p_session_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'add_session_to_game_stats failed for session %: %', p_session_id, SQLERRM;
    END;
    BEGIN
    PERFORM exp_ccg_01.score_and_validate_session(p_session_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'score_and_validate_session failed for session %: %', p_session_id, SQLERRM;
    END;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.complete_experiment_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.complete_experiment_session(UUID) TO service_role;
