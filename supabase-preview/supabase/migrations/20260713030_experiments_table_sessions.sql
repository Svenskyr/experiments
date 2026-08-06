-- Tracks experiment sessions (entries) across all experiments.
CREATE TABLE IF NOT EXISTS experiments.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES experiments.users(user_id) ON DELETE CASCADE,
    experiment_id TEXT NOT NULL REFERENCES experiments.experiments(experiment_id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'unspecified',
    status TEXT NOT NULL DEFAULT 'in_progress',
    source TEXT DEFAULT NULL, -- whatever source was set in the url param
    platform TEXT DEFAULT NULL, -- inherited from experiments.users.platform
    platform_session_id TEXT DEFAULT NULL, -- Platform's unique identifier for session (pid, study_id). Null for non-platform users.
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    auth_id UUID, -- for checking session cross-overs
    user_agent JSONB
);

GRANT SELECT, INSERT, UPDATE ON experiments.sessions TO service_role;
GRANT UPDATE (user_agent) ON experiments.sessions TO authenticated;

ALTER TABLE experiments.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select self"
ON experiments.sessions FOR SELECT TO authenticated USING (user_id = (select experiments.uid()));
CREATE POLICY "Allow users to update self user_agent"
ON experiments.sessions FOR UPDATE TO authenticated USING (user_id = (select experiments.uid()));

CREATE INDEX idx_sessions_in_progress_last_active_at ON experiments.sessions (last_active_at)
    INCLUDE (experiment_id, role)
    WHERE status = 'in_progress';

CREATE UNIQUE INDEX idx_one_completed_platform_session_per_user_per_experiment
ON experiments.sessions (user_id, experiment_id, platform_session_id)
    WHERE status = 'completed' AND platform_session_id IS NOT NULL;

CREATE OR REPLACE VIEW experiments.duplicated_platform_sessions
WITH (security_invoker = true) AS
SELECT *
FROM (
    SELECT
        *,
        COUNT(*) OVER (PARTITION BY platform_session_id) AS session_count
    FROM experiments.sessions
    WHERE platform_session_id IS NOT NULL
) AS sessions_with_counts
WHERE session_count > 1;
