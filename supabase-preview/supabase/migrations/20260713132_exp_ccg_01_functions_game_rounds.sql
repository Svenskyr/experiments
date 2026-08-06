-- Inserts submitted rounds for the caller's session. Conflicts on (session_id, local_round_number) are skipped.
-- Returns rid only for rows that were actually inserted (not for duplicates).
CREATE OR REPLACE FUNCTION exp_ccg_01.submit_game_rounds(rounds exp_ccg_01.game_round_submission[])
RETURNS TABLE (local_round_number INTEGER, rid INTEGER)
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = exp_ccg_01
AS $$
#variable_conflict use_column
DECLARE
    v_session_id UUID := exp_ccg_01.said();
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM experiments.sessions
    WHERE experiment_id = 'exp_ccg_01'
        AND session_id = v_session_id;

    RETURN QUERY
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
        v_session_id,
        v_role,
        sub.local_round_number,
        sub.player_1_avatar,
        sub.player_2_avatar,
        sub.choice_option_1,
        sub.choice_option_2,
        sub.player_1_chose,
        sub.choice_option_1_prediction,
        sub.time_elapsed_seconds
    FROM unnest(rounds) AS sub
    ON CONFLICT (session_id, local_round_number) DO NOTHING
    RETURNING exp_ccg_01.game_rounds.local_round_number, exp_ccg_01.game_rounds.rid;
END;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.submit_game_rounds(exp_ccg_01.game_round_submission[]) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.submit_game_rounds(exp_ccg_01.game_round_submission[]) TO authenticated, service_role;


-- Called on session completion to synthesize the outcomes of game rounds.
CREATE OR REPLACE FUNCTION exp_ccg_01.synthesize_game_round_outcomes(p_session_id UUID, p_overwrite BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE sql
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = exp_ccg_01
AS $$
    WITH round_data AS (
        SELECT
            gr.rid,
            gr.player_1_chose,
            gr.choice_option_1,
            gr.choice_option_2,
            mirror_stats.θ AS target_θ,
            CASE
                WHEN random() < mirror_stats.θ THEN gr.choice_option_2
                ELSE gr.choice_option_1
            END AS player_2_chose
        FROM exp_ccg_01.game_rounds AS gr
        INNER JOIN exp_ccg_01.game_stats AS mirror_stats
            ON mirror_stats.player_1_avatar = gr.player_2_avatar
            AND mirror_stats.player_2_avatar = gr.player_1_avatar
            AND mirror_stats.choice_option_1 = gr.choice_option_2
            AND mirror_stats.choice_option_2 = gr.choice_option_1
        LEFT JOIN exp_ccg_01.game_rounds AS self_mirror
            ON gr.player_1_avatar = gr.player_2_avatar
            AND self_mirror.session_id = gr.session_id
            AND self_mirror.player_1_avatar = gr.player_2_avatar
            AND self_mirror.player_2_avatar = gr.player_1_avatar
            AND self_mirror.choice_option_1 = gr.choice_option_2
            AND self_mirror.choice_option_2 = gr.choice_option_1
        WHERE gr.session_id = p_session_id
            AND (gr.target_θ IS NULL OR p_overwrite)
            AND mirror_stats.θ IS NOT NULL
    )
    UPDATE exp_ccg_01.game_rounds AS gr
    SET
        target_θ = rd.target_θ,
        player_2_chose = rd.player_2_chose,
        matched_rid = 0,
        matched_at = now(),
        coordination_outcome = CASE
            WHEN gr.player_1_chose = rd.player_2_chose THEN
                'coordinated on: ' || gr.player_1_chose ||
                CASE
                    WHEN gr.player_1_chose = gr.choice_option_1 THEN ' (choice_1)'
                    ELSE ' (choice_2)'
                END
            ELSE 'no coordination'
        END,
        coordination_score = CASE
            WHEN gr.player_1_chose = rd.player_2_chose THEN
                CASE
                    WHEN gr.player_1_chose = gr.choice_option_1 THEN 2
                    ELSE 1
                END
            ELSE 0
        END
    FROM round_data AS rd
    WHERE gr.rid = rd.rid;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.synthesize_game_round_outcomes(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.synthesize_game_round_outcomes(UUID, BOOLEAN) TO service_role;


CREATE OR REPLACE FUNCTION exp_ccg_01.add_session_to_game_stats(p_session_id UUID)
RETURNS VOID
LANGUAGE sql
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = exp_ccg_01
AS $$

    WITH direct_stats AS (
        SELECT
            player_1_avatar,
            player_2_avatar,
            choice_option_1,
            choice_option_2,
            COUNT(*)::INTEGER AS add_to_total_count,
            COUNT(*) FILTER (WHERE player_1_chose = choice_option_2)::INTEGER AS add_to_chose_option_2,
            SUM(choice_option_1_prediction)::REAL AS direct_prediction_sum
        FROM exp_ccg_01.game_rounds
        WHERE session_id = p_session_id
        AND player_1_role != 'tester'
        GROUP BY 1, 2, 3, 4
    ),
    data_to_add AS (
        SELECT
            s.player_1_avatar,
            s.player_2_avatar,
            s.choice_option_1,
            s.choice_option_2,
            s.add_to_total_count,
            s.add_to_chose_option_2,
            p.direct_prediction_sum AS add_to_θ_mean_prediction,
            p.add_to_total_count AS n_added_predictions
        FROM direct_stats AS s
        LEFT JOIN direct_stats AS p
            ON p.player_1_avatar = s.player_2_avatar
            AND p.player_2_avatar = s.player_1_avatar
            AND p.choice_option_1 = s.choice_option_2
            AND p.choice_option_2 = s.choice_option_1
    )
    UPDATE exp_ccg_01.game_stats AS gs
    SET
        total_count = gs.total_count + dta.add_to_total_count,
        count_player_1_chose_option_2 = gs.count_player_1_chose_option_2 + dta.add_to_chose_option_2,
        θ = (gs.count_player_1_chose_option_2 + dta.add_to_chose_option_2)::REAL
            / (gs.total_count + dta.add_to_total_count)::REAL,
        θ_mean_prediction = ((gs.θ_mean_prediction * mirror.total_count)
            + dta.add_to_θ_mean_prediction)
            / (mirror.total_count + dta.n_added_predictions)::REAL,
        updated_at = now()
    FROM data_to_add AS dta
    JOIN exp_ccg_01.game_stats AS mirror
        ON mirror.player_1_avatar = dta.player_2_avatar
        AND mirror.player_2_avatar = dta.player_1_avatar
        AND mirror.choice_option_1 = dta.choice_option_2
        AND mirror.choice_option_2 = dta.choice_option_1
    WHERE (gs.player_1_avatar, gs.player_2_avatar, gs.choice_option_1, gs.choice_option_2)
        = (dta.player_1_avatar, dta.player_2_avatar, dta.choice_option_1, dta.choice_option_2);
    
    -- WITH counts_to_add AS (
    --     SELECT
    --         player_1_avatar,
    --         player_2_avatar,
    --         choice_option_1,
    --         choice_option_2,
    --         COUNT(*) AS add_to_total_count,
    --         COUNT(*) FILTER (WHERE player_1_chose = choice_option_2) AS add_to_chose_option_2,
    --         SUM(choice_option_1_prediction) AS add_to_θ_mean_prediction
    --     FROM exp_ccg_01.game_rounds
    --     WHERE session_id = p_session_id
    --     AND player_1_role != 'tester'
    --     GROUP BY 1, 2, 3, 4
    -- ),
    -- updated_counts AS (
    --     UPDATE exp_ccg_01.game_stats AS gs
    --     SET
    --         total_count = gs.total_count + cta.add_to_total_count,
    --         count_player_1_chose_option_2 = gs.count_player_1_chose_option_2 + cta.add_to_chose_option_2,
    --         θ = (gs.count_player_1_chose_option_2 + cta.add_to_chose_option_2)::REAL
    --             / (gs.total_count + cta.add_to_total_count)::REAL,
    --         updated_at = now()
    --     FROM counts_to_add AS cta
    --     WHERE (gs.player_1_avatar, gs.player_2_avatar, gs.choice_option_1, gs.choice_option_2)
    --         = (cta.player_1_avatar, cta.player_2_avatar, cta.choice_option_1, cta.choice_option_2)
    --     RETURNING
    --         gs.player_1_avatar,
    --         gs.player_2_avatar,
    --         gs.choice_option_1,
    --         gs.choice_option_2,
    --         gs.total_count AS new_total_count, -- TODO: Verify that this is indeed the new total and not the old total
    --         cta.add_to_total_count,
    --         cta.add_to_θ_mean_prediction
    -- ),
    -- updated_predictions_on_mirrors AS (
    --     UPDATE exp_ccg_01.game_stats AS ms
    --     SET
    --         θ_mean_prediction = ((ms.θ_mean_prediction * (uc.new_total_count - uc.add_to_total_count))
    --         + (uc.add_to_θ_mean_prediction))
    --         / uc.new_total_count::REAL,
    --         updated_at = now()
    --     FROM updated_counts AS uc
    --     WHERE (ms.player_1_avatar, ms.player_2_avatar, ms.choice_option_1, ms.choice_option_2)
    --         = (uc.player_2_avatar, uc.player_1_avatar, uc.choice_option_2, uc.choice_option_1)
    -- )
    -- SELECT;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.add_session_to_game_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.add_session_to_game_stats(UUID) TO service_role;