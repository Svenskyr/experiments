CREATE TABLE IF NOT EXISTS exp_ccg_01.survey (
    session_id UUID REFERENCES exp_ccg_01.sessions(session_id) ON DELETE CASCADE NOT NULL,
    qid TEXT NOT NULL, -- e.g. SQ-1-1
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL, -- "rsq"
    responses JSONB NOT NULL, -- { itemId: itemId, value: value, displayOrder: displayOrder }
    PRIMARY KEY (session_id, qid)
);
GRANT SELECT, INSERT, UPDATE ON exp_ccg_01.survey TO authenticated, service_role;

ALTER TABLE exp_ccg_01.survey ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow sessions to select self survey" ON exp_ccg_01.survey
    FOR SELECT USING (session_id = (select exp_ccg_01.said()));
CREATE POLICY "Allow sessions to insert self survey" ON exp_ccg_01.survey
    FOR INSERT WITH CHECK (session_id = (select exp_ccg_01.said()));
CREATE POLICY "Allow sessions to update self survey" ON exp_ccg_01.survey
    FOR UPDATE USING (session_id = (select exp_ccg_01.said()));
