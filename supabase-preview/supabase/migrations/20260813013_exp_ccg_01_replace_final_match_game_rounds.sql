CREATE OR REPLACE FUNCTION exp_ccg_01_final.match_game_rounds()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = exp_ccg_01, exp_ccg_01_final, experiments
AS $$
    -- Mirror signature + per-seeker random pick (same as exp_ccg_01.find_matching_round).
    WITH picked AS (
        SELECT
            seeker.rid AS seeker_rid,
            seeker.player_1_chose AS seeker_player_1_chose,
            seeker.choice_option_1,
            seeker.choice_option_2,
            match_round.rid AS match_rid,
            match_round.player_1_chose,
            ROW_NUMBER() OVER (PARTITION BY seeker.rid ORDER BY experiments.deterministic_uniform_random('match:' || seeker.rid || ':' || match_round.rid)) AS rn
        FROM exp_ccg_01_final.game_rounds AS seeker
        JOIN exp_ccg_01_final.game_rounds AS match_round
            ON match_round.player_1_avatar = seeker.player_2_avatar
            AND match_round.player_2_avatar = seeker.player_1_avatar
            AND match_round.choice_option_1 = seeker.choice_option_2
            AND match_round.choice_option_2 = seeker.choice_option_1
            AND match_round.session_id != seeker.session_id
            AND match_round.player_1_role = 'participant'
    )
    UPDATE exp_ccg_01_final.game_rounds AS gr
    SET
        matched_rid = picked.match_rid,
        matched_at = now(),
        player_2_chose = picked.player_1_chose,
        coordination_outcome = CASE
            WHEN picked.seeker_player_1_chose = picked.player_1_chose THEN
                'coordinated on: ' || picked.seeker_player_1_chose ||
                CASE
                    WHEN picked.seeker_player_1_chose = picked.choice_option_1 THEN ' (choice_1)'
                    ELSE ' (choice_2)'
                END
            ELSE 'no coordination'
        END,
        coordination_score = CASE
            WHEN picked.seeker_player_1_chose = picked.player_1_chose THEN
                CASE
                    WHEN picked.seeker_player_1_chose = picked.choice_option_1 THEN 2
                    ELSE 1
                END
            ELSE 0
        END
    FROM picked
    WHERE gr.rid = picked.seeker_rid
        AND picked.rn = 1;
$$;
REVOKE EXECUTE ON ROUTINE exp_ccg_01_final.match_game_rounds() FROM PUBLIC;
