CREATE TABLE IF NOT EXISTS exp_ccg_01.feedback (
    session_id UUID REFERENCES exp_ccg_01.sessions(session_id) ON DELETE CASCADE NOT NULL,
    page TEXT NOT NULL,
    label TEXT NOT NULL,
    ratings JSONB, -- { itemId: itemId, rating: rating }
    comments JSONB, -- { itemId: itemId, comment: comment }
    PRIMARY KEY (session_id, page, label)
);
GRANT SELECT, INSERT, UPDATE ON exp_ccg_01.feedback TO authenticated, service_role;

ALTER TABLE exp_ccg_01.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow sessions to select self feedback" ON exp_ccg_01.feedback
    FOR SELECT USING (session_id = (select exp_ccg_01.said()));
CREATE POLICY "Allow sessions to insert self feedback" ON exp_ccg_01.feedback
    FOR INSERT WITH CHECK (session_id = (select exp_ccg_01.said()));
CREATE POLICY "Allow sessions to update self feedback" ON exp_ccg_01.feedback
    FOR UPDATE USING (session_id = (select exp_ccg_01.said()));
