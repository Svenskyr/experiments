CREATE TABLE IF NOT EXISTS exp_ccg_01.game_rounds (
    rid INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    session_id UUID REFERENCES exp_ccg_01.sessions(session_id) ON DELETE CASCADE,
    player_1_role TEXT NOT NULL,
    local_round_number INTEGER NOT NULL,
    player_1_avatar TEXT NOT NULL,
    player_2_avatar TEXT NOT NULL,
    choice_option_1 TEXT NOT NULL,
    choice_option_2 TEXT NOT NULL,
    player_1_chose TEXT NOT NULL,
    player_2_chose TEXT DEFAULT NULL,
    coordination_outcome TEXT DEFAULT NULL,
    coordination_score INTEGER DEFAULT NULL,
    choice_option_1_prediction REAL NOT NULL,
    target_θ REAL DEFAULT NULL, -- Target θ for choice_option_1_prediction at time of experiment completion
    time_elapsed_seconds REAL NOT NULL DEFAULT -1,
    inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    matched_at TIMESTAMPTZ DEFAULT NULL,
    matched_rid INTEGER DEFAULT NULL, --- 0 if synthetic outcome
    UNIQUE (session_id, local_round_number),
    CHECK (local_round_number >= 0 AND local_round_number <= 48)
);
GRANT SELECT ON exp_ccg_01.game_rounds TO authenticated, service_role;

ALTER TABLE exp_ccg_01.game_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow sessions to select self game rounds" ON exp_ccg_01.game_rounds
    FOR SELECT USING (session_id = (select exp_ccg_01.said()));

CREATE INDEX idx_game_rounds_session_id ON exp_ccg_01.game_rounds (session_id);

-- CREATE INDEX idx_for_witness_rounds ON exp_ccg_01.game_rounds
--     (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2, player_1_chose, rid DESC)
--     INCLUDE (session_id, player_1_role)
--     WHERE player_1_role != 'tester';

CREATE INDEX idx_for_game_stats ON exp_ccg_01.game_rounds
    (player_1_avatar, player_2_avatar, choice_option_1, choice_option_2)
    INCLUDE (player_1_chose, choice_option_1_prediction)
    WHERE player_1_role != 'tester';


CREATE TYPE exp_ccg_01.game_round_signature AS (
    player_1_avatar TEXT,
    player_2_avatar TEXT,
    choice_option_1 TEXT,
    choice_option_2 TEXT
);

CREATE TYPE exp_ccg_01.game_round_submission AS (
    local_round_number INTEGER,
    player_1_avatar TEXT,
    player_2_avatar TEXT,
    choice_option_1 TEXT,
    choice_option_2 TEXT,
    player_1_chose TEXT,
    choice_option_1_prediction REAL,
    time_elapsed_seconds REAL
);
