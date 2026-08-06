CREATE TYPE experiments.quota_data AS (
    within_quota BOOLEAN,
    quota INTEGER,
    quota_buffer INTEGER,
    participants_completed INTEGER,
    participants_in_progress INTEGER
);


CREATE OR REPLACE FUNCTION experiments.get_fresh_quota_data(p_experiment_id TEXT, p_new_admission BOOLEAN DEFAULT FALSE)
RETURNS experiments.quota_data
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = experiments
AS $$
DECLARE
    v_quota_data experiments.quota_data;
BEGIN
    CALL experiments.sweep_expired_sessions();
    -- SELECT * INTO v_quota_data FROM experiments.experiments WHERE experiment_id = p_experiment_id AND active = TRUE;
    SELECT
        NULL::BOOLEAN,
        e.quota,
        e.quota_buffer,
        e.participants_completed,
        e.participants_in_progress
    INTO v_quota_data
    FROM experiments.experiments e
    WHERE e.experiment_id = p_experiment_id
        AND e.active = TRUE;

    v_quota_data := experiments.determine_within_quota(v_quota_data);

    IF p_new_admission AND v_quota_data.within_quota = TRUE THEN
        UPDATE experiments.experiments SET last_quota_admission_at = now()
        WHERE experiment_id = p_experiment_id;
    END IF;

    RETURN v_quota_data;
END;
$$;
REVOKE EXECUTE ON ROUTINE experiments.get_fresh_quota_data(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.get_fresh_quota_data(TEXT, BOOLEAN) TO service_role;


CREATE OR REPLACE FUNCTION experiments.determine_within_quota(quota_data experiments.quota_data)
RETURNS experiments.quota_data
LANGUAGE plpgsql
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = experiments
AS $$
BEGIN

    IF quota_data.participants_completed >= quota_data.quota THEN
        quota_data.within_quota := FALSE;
    ELSIF quota_data.participants_completed + quota_data.participants_in_progress >= quota_data.quota + quota_data.quota_buffer THEN
        quota_data.within_quota := FALSE;
    ELSE
        quota_data.within_quota := TRUE;
    END IF;

    RETURN quota_data;
END;
$$;
REVOKE EXECUTE ON ROUTINE experiments.determine_within_quota(experiments.quota_data) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.determine_within_quota(experiments.quota_data) TO service_role;


CREATE OR REPLACE FUNCTION experiments.request_session_reactivation(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = experiments
AS $$
DECLARE
    v_session experiments.sessions;
    v_quota_data experiments.quota_data;
BEGIN
    -- Get session
    SELECT * INTO v_session FROM experiments.sessions WHERE session_id = p_session_id;

    -- If session isn't expired, then reactivation is unnecessary.
    IF v_session.status != 'expired' THEN
        RETURN TRUE;
    END IF;

    -- If session.role != 'participant', then reactivation is always allowed.
    IF v_session.role != 'participant' THEN
        UPDATE experiments.sessions SET status = 'in_progress' WHERE session_id = p_session_id;
        UPDATE experiments.experiments SET
            sessions_in_progress = sessions_in_progress + 1
            WHERE experiment_id = v_session.experiment_id;
        RETURN TRUE;
    END IF;

    -- Get participant quota data for experiment   
    v_quota_data := experiments.get_fresh_quota_data(v_session.experiment_id);

    IF v_quota_data.within_quota IS NOT DISTINCT FROM FALSE THEN
        RETURN FALSE;
    ELSE
        BEGIN
        UPDATE experiments.sessions SET
            status = 'in_progress',
            updated_at = now(),
            last_active_at = now()
        WHERE session_id = p_session_id;
        UPDATE experiments.experiments SET
            sessions_in_progress = sessions_in_progress + 1,
            participants_in_progress = participants_in_progress + 1
        WHERE experiment_id = v_session.experiment_id;
        RETURN TRUE;
        END;
    END IF;
END;
$$;
REVOKE EXECUTE ON ROUTINE experiments.request_session_reactivation(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.request_session_reactivation(UUID) TO service_role;
