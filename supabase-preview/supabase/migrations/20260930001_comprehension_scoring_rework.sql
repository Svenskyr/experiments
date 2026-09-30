ALTER TABLE exp_ccg_01.comprehension ADD COLUMN IF NOT EXISTS max_possible_score REAL;
ALTER TABLE exp_ccg_01_final.comprehension ADD COLUMN IF NOT EXISTS max_possible_score REAL;

UPDATE exp_ccg_01.comprehension
SET max_possible_score = 1
WHERE max_possible_score IS NULL;

UPDATE exp_ccg_01_final.comprehension
SET max_possible_score = 1
WHERE max_possible_score IS NULL;

ALTER TABLE exp_ccg_01.comprehension
    ALTER COLUMN max_possible_score SET NOT NULL;

ALTER TABLE exp_ccg_01_final.comprehension
    ALTER COLUMN max_possible_score SET NOT NULL;
