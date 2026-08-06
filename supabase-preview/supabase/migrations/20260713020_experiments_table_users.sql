-- Primary user table: experiments.users. Tracks all users across all experiments.
CREATE TABLE IF NOT EXISTS experiments.users (
    user_id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    pid TEXT NOT NULL, -- e.g. Prolific PID or user-provided identifier. Unique within platform.
    platform TEXT DEFAULT NULL, -- e.g. "prolific" - ONLY SET IF VERIFIED THROUGH EXTERNAL API.
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (pid, platform)
);
GRANT SELECT, INSERT, UPDATE ON experiments.users TO service_role;
ALTER TABLE experiments.users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pid_platform ON experiments.users (pid, platform);


-- Tracks links between experiments.users and auth.users.
CREATE TABLE IF NOT EXISTS experiments.user_auth_ids (
    user_id UUID NOT NULL REFERENCES experiments.users(user_id) ON DELETE CASCADE,
    auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    replaced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    PRIMARY KEY (user_id, auth_id)
);
GRANT SELECT, INSERT, UPDATE ON experiments.user_auth_ids TO service_role;
GRANT SELECT ON experiments.user_auth_ids TO authenticated;

ALTER TABLE experiments.user_auth_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select self" ON experiments.user_auth_ids
    FOR SELECT USING (auth_id = (select auth.uid()));

CREATE UNIQUE INDEX idx_active_user_auth_ids ON experiments.user_auth_ids (auth_id)
    WHERE replaced_at IS NULL;


-- Returns (user_id | NULL) associated with the request's auth.uid().
CREATE OR REPLACE FUNCTION experiments.uid()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = experiments
AS $$
    SELECT user_id
    FROM experiments.user_auth_ids
    WHERE auth_id = (select auth.uid())
        AND replaced_at IS NULL;
$$;
REVOKE EXECUTE ON ROUTINE experiments.uid() FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.uid() TO authenticated, service_role;
