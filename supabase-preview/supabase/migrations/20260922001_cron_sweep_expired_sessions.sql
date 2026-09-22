SELECT cron.unschedule('experiments-sweep_expired_sessions');

SELECT cron.schedule(
    'experiments-sweep_expired_sessions',
    '0 */6 * * *',
    $$CALL experiments.sweep_expired_sessions()$$
);