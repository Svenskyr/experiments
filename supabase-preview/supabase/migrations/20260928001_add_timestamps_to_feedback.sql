ALTER TABLE exp_ccg_01.feedback
    ADD created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ADD updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();


CREATE OR REPLACE FUNCTION exp_ccg_01.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET SEARCH_PATH = exp_ccg_01
AS $$
BEGIN
    NEW.created_at = OLD.created_at;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION exp_ccg_01.update_timestamp() FROM PUBLIC;

CREATE TRIGGER update_feedback_timestamp BEFORE UPDATE ON exp_ccg_01.feedback FOR EACH ROW EXECUTE FUNCTION exp_ccg_01.update_timestamp();
