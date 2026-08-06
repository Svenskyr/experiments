CREATE OR REPLACE PROCEDURE experiments.sweep_expired_sessions()
LANGUAGE sql
SECURITY DEFINER
SET search_path = experiments
AS $$
    WITH expired AS (
        UPDATE experiments.sessions AS session
        SET status = 'expired', updated_at = now()
        FROM experiments.experiments AS experiment
        WHERE session.experiment_id = experiment.experiment_id
        AND session.status = 'in_progress'
        AND session.last_active_at < now() - experiment.session_expiration_interval
        RETURNING session.experiment_id, session.role
    ),
    counts AS (
        SELECT
            experiment_id,
            count(*) AS sessions_expired_count,
            count(*) FILTER (WHERE role = 'participant') AS participants_expired_count
        FROM expired
        GROUP BY experiment_id
    )

    UPDATE experiments.experiments AS experiment
    SET
        sessions_in_progress = experiment.sessions_in_progress - count.sessions_expired_count,
        participants_in_progress = experiment.participants_in_progress - count.participants_expired_count
        FROM counts AS count
        WHERE experiment.experiment_id = count.experiment_id;

$$;
REVOKE EXECUTE ON ROUTINE experiments.sweep_expired_sessions() FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.sweep_expired_sessions() TO service_role;
