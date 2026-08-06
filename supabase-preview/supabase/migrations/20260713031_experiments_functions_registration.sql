CREATE TYPE experiments.registration_request AS (
    experiment_id TEXT,
    auth_id UUID,
    pid TEXT,
    source TEXT,
    platform TEXT,
    platform_session_id TEXT,
    role TEXT
);


CREATE OR REPLACE FUNCTION experiments.register_for_experiment(
    p_request experiments.registration_request
)
RETURNS TABLE (user_id UUID, session_id UUID)
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = experiments
AS $$
DECLARE
    v_user_id UUID;
    v_session_id UUID;
BEGIN
    -- Search for user by pid and platform.
    -- Since the below function is STRICT, always returns null if platform is null (unverified user).
    v_user_id := experiments.get_or_create_verified_platform_user(p_request.pid, p_request.platform);

    -- If verified user, then check if they have a completed platform session for this experiment.
    IF v_user_id IS NOT NULL AND p_request.platform_session_id IS NOT NULL THEN

        -- If platform_session_id already has a completed session,
        -- then strip it before continuing.
        IF EXISTS (
            SELECT 1
            FROM experiments.sessions AS session
            WHERE session.user_id = v_user_id
                AND session.experiment_id = p_request.experiment_id
                AND session.platform_session_id = p_request.platform_session_id
                AND session.status = 'completed'
        ) THEN
            p_request.platform_session_id := NULL;
            p_request.role := 'duplicate_session_id';

        -- Otherwise, reuse platform_session_id,
        -- but expire all prior sessions that used it.
        ELSE
            WITH superceded AS (
                UPDATE experiments.sessions AS session
                SET status = 'superceded', updated_at = now()
                WHERE session.user_id = v_user_id
                    AND session.experiment_id = p_request.experiment_id
                    AND session.platform_session_id = p_request.platform_session_id
                    AND session.status = 'in_progress'
                RETURNING session.experiment_id, session.role
            )
            UPDATE experiments.experiments AS experiment
            SET
                sessions_in_progress = experiment.sessions_in_progress - count.sessions,
                participants_in_progress = experiment.participants_in_progress - count.participant_sessions
            FROM (
                SELECT
                    experiment_id,
                    count(*) AS sessions,
                    count(*) FILTER (WHERE role = 'participant') AS participant_sessions
                FROM superceded
                GROUP BY experiment_id
            ) AS count
            WHERE experiment.experiment_id = count.experiment_id;
        END IF;
    END IF;

    -- If no verified user, then create a new generic user
    IF v_user_id IS NULL THEN
        IF p_request.role = 'participant' THEN p_request.role := 'impostor'; END IF;
        v_user_id := experiments.create_generic_user(p_request.pid);
    END IF;

    -- Link user_id to auth_id
    CALL experiments.link_user_to_auth(v_user_id, p_request.auth_id);

    -- Create a new global session in experiments.sessions
    INSERT INTO experiments.sessions (
        user_id,
        experiment_id,
        role,
        source,
        platform,
        platform_session_id,
        auth_id
    ) VALUES (
        v_user_id,
        p_request.experiment_id,
        p_request.role,
        p_request.source,
        p_request.platform,
        p_request.platform_session_id,
        p_request.auth_id
    ) RETURNING experiments.sessions.session_id INTO v_session_id;

    -- Create a new local session in {p_request.experiment_id}.sessions
    EXECUTE format(
        'INSERT INTO %I.sessions (session_id, user_id) VALUES ($1, $2)',
        p_request.experiment_id
    ) USING v_session_id, v_user_id;


    -- Link session to auth_id in the experiment schema
    EXECUTE format(
        'CALL %I.link_session_to_auth($1, $2)',
        p_request.experiment_id
    ) USING v_session_id, p_request.auth_id;

    -- Update experiment counters
    UPDATE experiments.experiments
        SET
            sessions_started = sessions_started + 1,
            sessions_in_progress = sessions_in_progress + 1,
            participants_started = participants_started + CASE WHEN p_request.role = 'participant' THEN 1 ELSE 0 END,
            participants_in_progress = participants_in_progress + CASE WHEN p_request.role = 'participant' THEN 1 ELSE 0 END
        WHERE experiment_id = p_request.experiment_id;

    RETURN QUERY SELECT v_user_id, v_session_id;
END;
$$;
REVOKE EXECUTE ON ROUTINE experiments.register_for_experiment(experiments.registration_request) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.register_for_experiment(experiments.registration_request) TO service_role;
