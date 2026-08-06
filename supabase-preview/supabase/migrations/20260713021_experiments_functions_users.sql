-- Returns (user_id) if user exists, otherwise creates a new verified user and returns (user_id).
CREATE OR REPLACE FUNCTION experiments.get_or_create_verified_platform_user(p_pid TEXT, p_platform TEXT)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = experiments
AS $$
DECLARE
  v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM experiments.users
    WHERE pid = p_pid AND platform = p_platform;

    IF v_user_id IS NULL THEN
        INSERT INTO experiments.users (pid, platform)
        VALUES (p_pid, p_platform)
        RETURNING user_id INTO v_user_id;
    END IF;

  RETURN v_user_id;
END;
$$;
REVOKE EXECUTE ON ROUTINE experiments.get_or_create_verified_platform_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.get_or_create_verified_platform_user(TEXT, TEXT) TO service_role;


-- Creates a new generic user.
CREATE OR REPLACE FUNCTION experiments.create_generic_user(p_pid TEXT)
RETURNS UUID
LANGUAGE sql
VOLATILE
STRICT
SECURITY INVOKER
SET search_path = experiments
AS $$
    INSERT INTO experiments.users (pid, platform)
    VALUES (p_pid, NULL)
    RETURNING user_id;
$$;
REVOKE EXECUTE ON ROUTINE experiments.create_generic_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.create_generic_user(TEXT) TO service_role;


-- Links an experiments.user to an auth.user.
-- If a previously-used auth_id is linked to a new account, then we deactivate old link and create new link.
CREATE OR REPLACE PROCEDURE experiments.link_user_to_auth(p_user_id UUID, p_auth_id UUID)
LANGUAGE sql
SECURITY INVOKER
SET search_path = experiments
AS $$
    -- Deactivate link between this auth_id and any other user.
    UPDATE experiments.user_auth_ids
    SET replaced_at = now()
    WHERE auth_id = p_auth_id AND user_id != p_user_id;

    -- Create new link between this user and this auth_id.
    INSERT INTO experiments.user_auth_ids (user_id, auth_id)
    VALUES (p_user_id, p_auth_id)
    ON CONFLICT (user_id, auth_id) DO UPDATE
    SET last_linked_at = now(), replaced_at = NULL;
$$;
REVOKE EXECUTE ON ROUTINE experiments.link_user_to_auth(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.link_user_to_auth(UUID, UUID) TO service_role;
