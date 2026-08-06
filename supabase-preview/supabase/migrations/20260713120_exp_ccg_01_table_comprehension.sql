CREATE TABLE IF NOT EXISTS exp_ccg_01.comprehension (
    session_id UUID REFERENCES exp_ccg_01.sessions(session_id) ON DELETE CASCADE,
    qid TEXT NOT NULL, -- e.g. CQ-1-1
    question_text TEXT NOT NULL,
    responses JSONB NOT NULL, -- { itemId: itemId, itemText: itemText, isSelected: isSelected, wasSelected: wasSelected }
    score REAL NOT NULL, -- Calculated before insertion
    PRIMARY KEY (session_id, qid)
);
GRANT SELECT, INSERT, UPDATE ON exp_ccg_01.comprehension TO service_role;

ALTER TABLE exp_ccg_01.comprehension ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow sessions to select self comprehension" ON exp_ccg_01.comprehension
    FOR SELECT USING (session_id = (select exp_ccg_01.said()));
