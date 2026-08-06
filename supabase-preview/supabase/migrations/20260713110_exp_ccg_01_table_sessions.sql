CREATE TABLE IF NOT EXISTS exp_ccg_01.sessions (
    session_id UUID PRIMARY KEY REFERENCES experiments.sessions(session_id) ON DELETE CASCADE,
    user_id UUID REFERENCES experiments.users(user_id) ON DELETE CASCADE,
    completion_points INTEGER,
    comprehension_points INTEGER,
    game_coordination_points INTEGER,
    game_prediction_points INTEGER,
    total_points INTEGER,
    attention_check_correct BOOLEAN,
    page_time_record JSONB,
    valid_record BOOLEAN,
    validity_report JSONB
);
GRANT SELECT, INSERT, UPDATE ON exp_ccg_01.sessions TO service_role;
GRANT SELECT, UPDATE (page_time_record, attention_check_correct) ON exp_ccg_01.sessions TO authenticated;
ALTER TABLE exp_ccg_01.sessions ENABLE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS exp_ccg_01.session_auth_ids (
    session_id UUID PRIMARY KEY REFERENCES exp_ccg_01.sessions(session_id) ON DELETE CASCADE,
    auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    replaced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
GRANT SELECT, INSERT, UPDATE ON exp_ccg_01.session_auth_ids TO service_role;
GRANT SELECT ON exp_ccg_01.session_auth_ids TO authenticated;

ALTER TABLE exp_ccg_01.session_auth_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select self by auth_id" ON exp_ccg_01.session_auth_ids
    FOR SELECT USING (auth_id = (select auth.uid()) AND replaced_at IS NULL);

CREATE UNIQUE INDEX idx_active_session_auth_ids ON exp_ccg_01.session_auth_ids (auth_id)
    WHERE replaced_at IS NULL;


CREATE OR REPLACE FUNCTION exp_ccg_01.said()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    SELECT session_id
    FROM exp_ccg_01.session_auth_ids
    WHERE auth_id = (select auth.uid())
        AND replaced_at IS NULL;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.said() FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.said() TO authenticated, service_role;

CREATE OR REPLACE PROCEDURE exp_ccg_01.link_session_to_auth(p_session_id UUID, p_auth_id UUID)
LANGUAGE sql
SECURITY INVOKER
SET search_path = exp_ccg_01
AS $$
    -- Deactivate link between this auth_id and any other session.
    UPDATE exp_ccg_01.session_auth_ids
    SET replaced_at = now()
    WHERE auth_id = p_auth_id AND session_id != p_session_id;

    -- Create new link between this session and this auth_id.
    INSERT INTO exp_ccg_01.session_auth_ids (session_id, auth_id)
    VALUES (p_session_id, p_auth_id)
    ON CONFLICT (session_id) DO UPDATE
    SET auth_id = EXCLUDED.auth_id, last_linked_at = now(), replaced_at = NULL;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.link_session_to_auth(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.link_session_to_auth(UUID, UUID) TO service_role;


CREATE POLICY "Allow sessions to select self" ON exp_ccg_01.sessions
    FOR SELECT USING (session_id = (select exp_ccg_01.said()));
CREATE POLICY "Allow sessions to update self page_time_record" ON exp_ccg_01.sessions
    FOR UPDATE USING (session_id = (select exp_ccg_01.said()));


-- Update the last_active_at timestamp for the session when page_time_record is updated (occurs on page load).
CREATE OR REPLACE FUNCTION exp_ccg_01.touch_session_last_active_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = exp_ccg_01, experiments
AS $$
BEGIN
    UPDATE experiments.sessions
    SET last_active_at = now()
    WHERE session_id = NEW.session_id;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION exp_ccg_01.touch_session_last_active_at() FROM PUBLIC;

CREATE TRIGGER trigger_touch_session_last_active_at
    AFTER UPDATE OF page_time_record ON exp_ccg_01.sessions
    FOR EACH ROW
    EXECUTE FUNCTION exp_ccg_01.touch_session_last_active_at();
