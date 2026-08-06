CREATE OR REPLACE VIEW exp_ccg_01_final.view_final_payments
WITH (security_invoker = true) AS
    SELECT
        s.session_id,
        s.role,
        s.platform,
        s.platform_session_id,
        s.completed_at,
        s.updated_at,
        (s.completion_points::numeric / 100)::numeric(4, 2) AS participation_payment,
        (s.comprehension_points::numeric / 100)::numeric(4, 2) AS comprehension_payment,
        (s.game_coordination_points::numeric / 100)::numeric(4, 2) AS game_coordination_payment,
        (s.game_prediction_points::numeric / 100)::numeric(4, 2) AS game_prediction_payment,
        (s.total_points::numeric / 100)::numeric(4, 2) AS total_payment,
        s.valid_record,
        s.validity_report
    FROM exp_ccg_01_final.sessions AS s
    WHERE s.role = 'participant';

GRANT SELECT ON exp_ccg_01_final.view_final_payments TO service_role;
