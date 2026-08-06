CREATE TABLE IF NOT EXISTS experiments.experiments (
    experiment_id TEXT PRIMARY KEY, -- e.g. exp_ccg_01
    name TEXT NOT NULL, -- e.g. "Color as a coordination mechanism"
    active BOOLEAN NOT NULL DEFAULT TRUE, -- set to FALSE when all participant sessions are completed
    sessions_started INTEGER NOT NULL DEFAULT 0, -- sessions started by all roles
    sessions_in_progress INTEGER NOT NULL DEFAULT 0, -- sessions in progress by all roles
    sessions_completed INTEGER NOT NULL DEFAULT 0, -- sessions completed by all roles
    participants_started INTEGER NOT NULL DEFAULT 0, -- sessions started by participants
    participants_in_progress INTEGER NOT NULL DEFAULT 0, -- sessions in progress by participants
    participants_completed INTEGER NOT NULL DEFAULT 0, -- sessions completed by participants
    quota INTEGER DEFAULT NULL, -- target for participants_completed
    quota_buffer INTEGER DEFAULT NULL, -- buffer for participants_in_progress
    last_quota_admission_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- for detecting post-admission but pre-registration participants
    admission_registration_interval INTERVAL DEFAULT '6 hours', -- time we guarantee for admission 🠖 registration (i.e., read consent)
    session_expiration_interval INTERVAL DEFAULT '6 hours', -- interval for session expiration
    CONSTRAINT quota_buffer_not_exceeded CHECK (participants_completed + participants_in_progress <= quota + quota_buffer)
);
GRANT SELECT, INSERT, UPDATE ON experiments.experiments TO service_role;
GRANT SELECT ON experiments.experiments TO authenticated;

ALTER TABLE experiments.experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select experiments.experiments" ON experiments.experiments
    FOR SELECT USING (active = TRUE);
