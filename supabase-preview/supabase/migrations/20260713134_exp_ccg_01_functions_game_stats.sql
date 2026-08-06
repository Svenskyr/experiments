CREATE OR REPLACE FUNCTION exp_ccg_01.rescan_game_stats()
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
            COUNT(*)::INTEGER AS total_count,
            COUNT(*) FILTER (WHERE player_1_chose = choice_option_2)::INTEGER AS count_player_1_chose_option_2,
            AVG(choice_option_1_prediction)::REAL AS direct_mean_prediction
        FROM exp_ccg_01.game_rounds
        WHERE player_1_role != 'tester'
        GROUP BY 1, 2, 3, 4
    ),
    new_data AS (
        SELECT
            s.player_1_avatar,
            s.player_2_avatar,
            s.choice_option_1,
            s.choice_option_2,
            s.total_count,
            s.count_player_1_chose_option_2,
            p.direct_mean_prediction AS θ_mean_prediction
        FROM direct_stats AS s
        LEFT JOIN direct_stats AS p
            ON p.player_1_avatar = s.player_2_avatar
            AND p.player_2_avatar = s.player_1_avatar
            AND p.choice_option_1 = s.choice_option_2
            AND p.choice_option_2 = s.choice_option_1
    )
    UPDATE exp_ccg_01.game_stats AS gs
    SET
        total_count = new.total_count,
        count_player_1_chose_option_2 = new.count_player_1_chose_option_2,
        θ = (new.count_player_1_chose_option_2)::REAL / (new.total_count)::REAL,
        θ_mean_prediction = new.θ_mean_prediction,
        updated_at = now()
    FROM new_data AS new
    WHERE (gs.player_1_avatar, gs.player_2_avatar, gs.choice_option_1, gs.choice_option_2)
        = (new.player_1_avatar, new.player_2_avatar, new.choice_option_1, new.choice_option_2);
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01.rescan_game_stats() FROM PUBLIC;
GRANT EXECUTE ON ROUTINE exp_ccg_01.rescan_game_stats() TO service_role;
