CREATE OR REPLACE VIEW exp_ccg_01.view_full_session
WITH (security_invoker = true) AS
SELECT
    session_lifecycle.session_id,
    session_lifecycle.user_id,
    exp_user.pid,
    session_lifecycle.experiment_id,
    session_lifecycle.role,
    session_lifecycle.status,
    session_lifecycle.source,
    session_lifecycle.platform,
    session_lifecycle.platform_session_id,
    session_lifecycle.started_at,
    session_lifecycle.last_active_at,
    session_lifecycle.updated_at,
    session_lifecycle.completed_at,
    session_lifecycle.auth_id,
    session_lifecycle.user_agent,
    exp_session.completion_points,
    exp_session.comprehension_points,
    exp_session.game_coordination_points,
    exp_session.game_prediction_points,
    exp_session.total_points,
    exp_session.page_time_record,
    exp_session.attention_check_correct,
    exp_session.valid_record,
    exp_session.validity_report
FROM exp_ccg_01.sessions AS exp_session
JOIN experiments.sessions AS session_lifecycle ON session_lifecycle.session_id = exp_session.session_id
JOIN experiments.users AS exp_user ON exp_user.user_id = session_lifecycle.user_id;

GRANT SELECT ON exp_ccg_01.view_full_session TO service_role;
