CREATE TABLE IF NOT EXISTS exp_ccg_01.game_stats (
    player_1_avatar TEXT NOT NULL,
    player_2_avatar TEXT NOT NULL,
    choice_option_1 TEXT NOT NULL,
    choice_option_2 TEXT NOT NULL,
    total_count INTEGER, -- total rounds for this permutation
    count_player_1_chose_option_2 INTEGER,
    θ REAL, -- target θ for signature mirrors
    -- θ = the rate that this player 1 (the mirror's player 2) chose option 2 (the mirror's choice_option_1)
    θ_mean_prediction REAL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2)
);
GRANT SELECT ON exp_ccg_01.game_stats TO service_role;
ALTER TABLE exp_ccg_01.game_stats ENABLE ROW LEVEL SECURITY;
