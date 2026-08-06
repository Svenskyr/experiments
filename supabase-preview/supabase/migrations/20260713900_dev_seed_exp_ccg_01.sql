-- Dev-only helpers for generating exp_ccg_01 participant fixtures.
-- Invoked from supabase/seed.sql on local `db reset`; safe to call manually, e.g.:
--   SELECT * FROM dev_seed.generate_exp_ccg_01_participants(12);

CREATE SCHEMA IF NOT EXISTS dev_seed;
GRANT USAGE ON SCHEMA dev_seed TO postgres, service_role;

CREATE OR REPLACE FUNCTION dev_seed.participant_auth_id(p_index integer)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (
        'a1' || lpad(p_index::text, 6, '0')
        || '-0000-4000-8000-'
        || lpad(to_hex(p_index), 12, '0')
    )::uuid;
$$;

CREATE OR REPLACE FUNCTION dev_seed.make_auth_user(p_auth_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        p_auth_id,
        'authenticated',
        'authenticated',
        p_email,
        crypt('password', gen_salt('bf'::text)),
        now(),
        now(),
        now()
    );
END;
$$;

CREATE OR REPLACE FUNCTION dev_seed.register_participant(
    p_index integer,
    p_auth_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = experiments, exp_ccg_01, dev_seed, public
AS $$
DECLARE
    v_auth_id uuid := COALESCE(p_auth_id, dev_seed.participant_auth_id(p_index));
    v_pid text := 'seed-participant-' || p_index::text;
    v_request experiments.registration_request;
    v_session_id uuid;
BEGIN
    PERFORM dev_seed.make_auth_user(v_auth_id, v_pid || '@seed.local');

    v_request.experiment_id := 'exp_ccg_01';
    v_request.auth_id := v_auth_id;
    v_request.pid := v_pid;
    v_request.source := 'seed';
    v_request.platform := 'seed';
    v_request.platform_session_id := 'seed-psid-' || p_index::text;
    v_request.role := 'participant';

    SELECT r.session_id
    INTO v_session_id
    FROM experiments.register_for_experiment(v_request) AS r;

    RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION dev_seed.play_round(
    p_session_id uuid,
    p_local_round_number integer,
    p_player_1_avatar text,
    p_player_2_avatar text,
    p_choice_option_1 text,
    p_choice_option_2 text,
    p_player_1_chose text,
    p_choice_option_1_prediction real,
    p_time_elapsed_seconds real DEFAULT 12.0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = exp_ccg_01, public
AS $$
DECLARE
    v_round exp_ccg_01.game_rounds;
BEGIN
    v_round := ROW(
        NULL::integer,
        p_session_id,
        'participant',
        p_local_round_number,
        p_player_1_avatar,
        p_player_2_avatar,
        p_choice_option_1,
        p_choice_option_2,
        p_player_1_chose,
        NULL::text,
        NULL::text,
        NULL::integer,
        p_choice_option_1_prediction,
        NULL::real,
        p_time_elapsed_seconds,
        now(),
        NULL::timestamptz,
        NULL::integer
    )::exp_ccg_01.game_rounds;

    PERFORM exp_ccg_01.complete_unmatched_round(v_round);
END;
$$;

CREATE OR REPLACE FUNCTION dev_seed.participant_avatar(p_index integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (ARRAY['fem1', 'fem2', 'masc1', 'masc2'])[1 + (p_index - 1) % 4];
$$;

CREATE OR REPLACE FUNCTION dev_seed.color_pair_at(p_pair_index integer)
RETURNS TABLE (choice_option_1 text, choice_option_2 text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_colors constant text[] := ARRAY['blue', 'pink', 'green', 'orange'];
    v_c1 integer := 1 + (p_pair_index / 3);
    v_c2_slot integer := p_pair_index % 3;
    v_other integer[] := ARRAY[]::integer[];
    v_i integer;
BEGIN
    IF p_pair_index < 0 OR p_pair_index > 11 THEN
        RAISE EXCEPTION 'p_pair_index must be between 0 and 11';
    END IF;

    FOR v_i IN 1 .. array_length(v_colors, 1) LOOP
        IF v_i != v_c1 THEN
            v_other := array_append(v_other, v_i);
        END IF;
    END LOOP;

    choice_option_1 := v_colors[v_c1];
    choice_option_2 := v_colors[v_other[v_c2_slot + 1]];
    RETURN NEXT;
END;
$$;

-- Enumerate round permutations the same way as the client game:
-- all partner avatars × all distinct ordered color pairs (48 total per player avatar).
CREATE OR REPLACE FUNCTION dev_seed.round_permutation(
    p_player_avatar text,
    p_permutation_index integer,
    OUT player_1_avatar text,
    OUT player_2_avatar text,
    OUT choice_option_1 text,
    OUT choice_option_2 text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_avatars constant text[] := ARRAY['fem1', 'fem2', 'masc1', 'masc2'];
    v_perm integer;
    v_partner_index integer;
    v_color_pair record;
BEGIN
    IF p_permutation_index < 1 OR p_permutation_index > 48 THEN
        RAISE EXCEPTION 'p_permutation_index must be between 1 and 48';
    END IF;

    v_perm := p_permutation_index - 1;
    v_partner_index := 1 + (v_perm / 12);

    player_1_avatar := p_player_avatar;
    player_2_avatar := v_avatars[v_partner_index];

    SELECT * INTO v_color_pair FROM dev_seed.color_pair_at(v_perm % 12);
    choice_option_1 := v_color_pair.choice_option_1;
    choice_option_2 := v_color_pair.choice_option_2;
END;
$$;

-- Deterministic ~70/30 spread per participant×round. Uses participant_index so
-- players on the same permutation (and mirror permutations) do not all pick the
-- same option — avoiding θ collapsing to 0 or 1 in dev game_stats.
CREATE OR REPLACE FUNCTION dev_seed.seeded_player_1_chose(
    p_participant_index integer,
    p_round_number integer,
    p_choice_option_1 text,
    p_choice_option_2 text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN (p_participant_index * 7 + p_round_number * 3) % 10 < 7
            THEN p_choice_option_1
        ELSE p_choice_option_2
    END;
$$;

CREATE OR REPLACE FUNCTION dev_seed.round_params(
    p_player_avatar text,
    p_round_number integer,
    p_participant_index integer DEFAULT 1,
    OUT player_1_avatar text,
    OUT player_2_avatar text,
    OUT choice_option_1 text,
    OUT choice_option_2 text,
    OUT player_1_chose text,
    OUT choice_option_1_prediction real,
    OUT time_elapsed_seconds real
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_perm record;
BEGIN
    SELECT *
    INTO v_perm
    FROM dev_seed.round_permutation(
        p_player_avatar,
        1 + ((p_round_number - 1) % 48)
    );

    player_1_avatar := v_perm.player_1_avatar;
    player_2_avatar := v_perm.player_2_avatar;
    choice_option_1 := v_perm.choice_option_1;
    choice_option_2 := v_perm.choice_option_2;
    player_1_chose := dev_seed.seeded_player_1_chose(
        p_participant_index,
        p_round_number,
        choice_option_1,
        choice_option_2
    );
    choice_option_1_prediction := CASE
        WHEN player_1_chose = choice_option_1 THEN 0.7
        ELSE 0.3
    END;
    time_elapsed_seconds := 0.0;
END;
$$;

CREATE OR REPLACE FUNCTION dev_seed.generate_exp_ccg_01_participants(
    p_participant_count integer DEFAULT 4,
    p_rounds_per_participant integer DEFAULT 6,
    p_start_index integer DEFAULT 1
)
RETURNS TABLE (
    participant_index integer,
    session_id uuid,
    auth_id uuid,
    pid text,
    player_avatar text,
    rounds_played integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dev_seed, exp_ccg_01, experiments, auth, extensions, public
AS $$
#variable_conflict use_column
DECLARE
    v_encrypted_password text;
BEGIN
    IF p_participant_count < 1 THEN
        RAISE EXCEPTION 'p_participant_count must be at least 1';
    END IF;
    IF p_rounds_per_participant < 1 THEN
        RAISE EXCEPTION 'p_rounds_per_participant must be at least 1';
    END IF;
    IF p_start_index < 1 THEN
        RAISE EXCEPTION 'p_start_index must be at least 1';
    END IF;

    v_encrypted_password := crypt('password', gen_salt('bf'::text));

    RETURN QUERY
    WITH indices AS (
        SELECT i AS participant_index
        FROM generate_series(p_start_index, p_start_index + p_participant_count - 1) AS i
    ),
    participants AS (
        SELECT
            idx.participant_index,
            dev_seed.participant_auth_id(idx.participant_index) AS auth_id,
            'seed-participant-' || idx.participant_index::text AS pid,
            'seed-psid-' || idx.participant_index::text AS platform_session_id,
            dev_seed.participant_avatar(idx.participant_index) AS player_avatar
        FROM indices idx
    ),
    auth_insert AS (
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at
        )
        SELECT
            '00000000-0000-0000-0000-000000000000',
            p.auth_id,
            'authenticated',
            'authenticated',
            p.pid || '@seed.local',
            v_encrypted_password,
            now(),
            now(),
            now()
        FROM participants p
        RETURNING id AS auth_id
    ),
    users_insert AS (
        INSERT INTO experiments.users (pid, platform)
        SELECT p.pid, 'seed'
        FROM participants p
        RETURNING user_id, pid
    ),
    user_auth_insert AS (
        INSERT INTO experiments.user_auth_ids (user_id, auth_id)
        SELECT u.user_id, p.auth_id
        FROM users_insert u
        JOIN participants p ON p.pid = u.pid
        RETURNING user_id, auth_id
    ),
    sessions_insert AS (
        INSERT INTO experiments.sessions (
            user_id,
            experiment_id,
            role,
            source,
            platform,
            platform_session_id,
            auth_id
        )
        SELECT
            u.user_id,
            'exp_ccg_01',
            'participant',
            'seed',
            'seed',
            p.platform_session_id,
            p.auth_id
        FROM participants p
        JOIN users_insert u ON u.pid = p.pid
        RETURNING session_id, user_id, auth_id
    ),
    exp_sessions_insert AS (
        INSERT INTO exp_ccg_01.sessions (session_id, user_id)
        SELECT s.session_id, s.user_id
        FROM sessions_insert s
        RETURNING session_id
    ),
    exp_session_auth_insert AS (
        INSERT INTO exp_ccg_01.session_auth_ids (session_id, auth_id)
        SELECT s.session_id, s.auth_id
        FROM sessions_insert s
        RETURNING session_id
    ),
    counter_update AS (
        UPDATE experiments.experiments
        SET
            sessions_started = sessions_started + p_participant_count,
            sessions_in_progress = sessions_in_progress + p_participant_count,
            participants_started = participants_started + p_participant_count,
            participants_in_progress = participants_in_progress + p_participant_count
        WHERE experiment_id = 'exp_ccg_01'
        RETURNING experiment_id
    ),
    rounds_insert AS (
        INSERT INTO exp_ccg_01.game_rounds (
            session_id,
            player_1_role,
            local_round_number,
            player_1_avatar,
            player_2_avatar,
            choice_option_1,
            choice_option_2,
            player_1_chose,
            choice_option_1_prediction,
            time_elapsed_seconds
        )
        SELECT
            s.session_id,
            'participant',
            round_num,
            perm.player_1_avatar,
            perm.player_2_avatar,
            perm.choice_option_1,
            perm.choice_option_2,
            chose.player_1_chose,
            chose.choice_option_1_prediction,
            0.0
        FROM sessions_insert s
        JOIN participants p ON p.auth_id = s.auth_id
        CROSS JOIN generate_series(1, p_rounds_per_participant) AS round_num
        JOIN LATERAL dev_seed.round_permutation(
            p.player_avatar,
            1 + ((round_num - 1) % 48)
        ) AS perm ON true
        JOIN LATERAL (
            SELECT
                dev_seed.seeded_player_1_chose(
                    p.participant_index,
                    round_num,
                    perm.choice_option_1,
                    perm.choice_option_2
                ) AS player_1_chose
        ) AS base_chose ON true
        JOIN LATERAL (
            SELECT
                base_chose.player_1_chose,
                CASE
                    WHEN base_chose.player_1_chose = perm.choice_option_1 THEN 0.7
                    ELSE 0.3
                END AS choice_option_1_prediction
        ) AS chose ON true
        RETURNING rid
    ),
    seeded AS (
        SELECT
            p.participant_index,
            s.session_id,
            p.auth_id,
            p.pid AS participant_pid,
            p.player_avatar,
            p_rounds_per_participant AS rounds_played
        FROM participants p
        JOIN sessions_insert s ON s.auth_id = p.auth_id
    )
    SELECT
        seeded.participant_index,
        seeded.session_id,
        seeded.auth_id,
        seeded.participant_pid,
        seeded.player_avatar,
        seeded.rounds_played
    FROM seeded;
END;
$$;

REVOKE ALL ON SCHEMA dev_seed FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dev_seed FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dev_seed TO postgres, service_role;
