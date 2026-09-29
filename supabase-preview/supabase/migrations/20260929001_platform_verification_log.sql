CREATE TABLE IF NOT EXISTS experiments.platform_verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    experiment_id TEXT NOT NULL,
    claim_platform TEXT NOT NULL,
    resolved_platform TEXT NOT NULL,
    study_id TEXT,
    pid TEXT,
    platform_session_id TEXT,
    role TEXT,
    success BOOLEAN NOT NULL,
    error TEXT,
    http_status INTEGER,
    experiments_session_id UUID
);

ALTER TABLE experiments.platform_verification_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON experiments.platform_verification_log TO service_role;

CREATE OR REPLACE FUNCTION experiments.log_platform_verification(
    p_experiment_id TEXT,
    p_claim_platform TEXT,
    p_resolved_platform TEXT,
    p_study_id TEXT,
    p_pid TEXT,
    p_platform_session_id TEXT,
    p_role TEXT,
    p_success BOOLEAN,
    p_error TEXT,
    p_http_status INTEGER,
    p_experiments_session_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = experiments
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO experiments.platform_verification_log (
        experiment_id,
        claim_platform,
        resolved_platform,
        study_id,
        pid,
        platform_session_id,
        role,
        success,
        error,
        http_status,
        experiments_session_id
    ) VALUES (
        p_experiment_id,
        p_claim_platform,
        p_resolved_platform,
        p_study_id,
        p_pid,
        p_platform_session_id,
        p_role,
        p_success,
        p_error,
        p_http_status,
        p_experiments_session_id
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON ROUTINE experiments.log_platform_verification(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, UUID
) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.log_platform_verification(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, UUID
) TO service_role;
