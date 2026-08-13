CREATE OR REPLACE FUNCTION exp_ccg_01.synthesize_game_round_outcomes(p_session_id UUID, p_overwrite BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE sql
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = exp_ccg_01, experiments
AS $$
    WITH round_data AS (
        SELECT
            gr.rid,
            gr.player_1_chose,
            gr.choice_option_1,
            gr.choice_option_2,
            mirror_stats.θ AS target_θ,
            CASE
                WHEN experiments.deterministic_uniform_random('outcome:' || gr.rid) < mirror_stats.θ THEN gr.choice_option_2
                ELSE gr.choice_option_1
            END AS player_2_chose
        FROM exp_ccg_01.game_rounds AS gr
        INNER JOIN exp_ccg_01.game_stats AS mirror_stats
            ON mirror_stats.player_1_avatar = gr.player_2_avatar
            AND mirror_stats.player_2_avatar = gr.player_1_avatar
            AND mirror_stats.choice_option_1 = gr.choice_option_2
            AND mirror_stats.choice_option_2 = gr.choice_option_1
        -- LEFT JOIN exp_ccg_01.game_rounds AS self_mirror
        --     ON gr.player_1_avatar = gr.player_2_avatar
        --     AND self_mirror.session_id = gr.session_id
        --     AND self_mirror.player_1_avatar = gr.player_2_avatar
        --     AND self_mirror.player_2_avatar = gr.player_1_avatar
        --     AND self_mirror.choice_option_1 = gr.choice_option_2
        --     AND self_mirror.choice_option_2 = gr.choice_option_1
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
