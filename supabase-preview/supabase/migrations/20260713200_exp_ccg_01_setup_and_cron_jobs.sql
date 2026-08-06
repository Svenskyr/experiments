INSERT INTO experiments.experiments (
    experiment_id,
    name,
    active,
    quota,
    quota_buffer,
    admission_registration_interval,
    session_expiration_interval
) VALUES (
    'exp_ccg_01',
    'Gender as a coordination mechanism (01)',
    TRUE,
    200, -- quota
    10, -- quota buffer
    '6 hours', -- interval for admission 🠖 registration
    '6 hours' -- interval for session expiration
    -- '1 minute' -- testing
);

-- UPDATE experiments.experiments
-- SET session_expiration_interval = '1 minute'
-- WHERE experiment_id = 'exp_ccg_01';


-- 4 avatars × 4 avatars × 4 choice options × 3 distinct second choices = 192 permutations
INSERT INTO exp_ccg_01.game_stats (
    player_1_avatar,
    player_2_avatar,
    choice_option_1,
    choice_option_2,
    total_count,
    count_player_1_chose_option_2,
    θ_mean_prediction
)
SELECT
    p1.avatar,
    p2.avatar,
    c1.color,
    c2.color,
    null,
    null,
    null
FROM (VALUES ('fem1'), ('fem2'), ('masc1'), ('masc2')) AS p1(avatar)
CROSS JOIN (VALUES ('fem1'), ('fem2'), ('masc1'), ('masc2')) AS p2(avatar)
CROSS JOIN (VALUES ('blue'), ('pink'), ('green'), ('orange')) AS c1(color)
CROSS JOIN (VALUES ('blue'), ('pink'), ('green'), ('orange')) AS c2(color)
WHERE c1.color <> c2.color;

SELECT cron.schedule(
    'experiments-sweep_expired_sessions',
    '0 */6 * * *', -- at minute 0, every 6 hours
    $$SELECT experiments.sweep_expired_sessions()$$
);

SELECT cron.schedule(
    'exp_ccg_01-rescan_game_stats', -- corrects any potential stat drift
    -- '* * * * *', -- at every minute
    '0 0 */1 * *', -- at 00:00, every day
    $$SELECT exp_ccg_01.rescan_game_stats()$$
);

SELECT cron.schedule(
    'exp_ccg_01-attempt_finalize_participant_sessions',
    -- '* * * * *', -- at every minute
    '1 * * * *', -- at minute 1, every hour
    -- '2 2 * * *', -- at 02:02, every day
    $$SELECT exp_ccg_01_final.attempt_finalize_participant_sessions()$$
);