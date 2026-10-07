-- 0027 · pg_cron schedules (§2, §8.4). pg_cron runs in UTC; WAT = UTC+1 (no DST).
-- cron.schedule() with an existing job name updates that job, so this migration is idempotent.
select cron.schedule('crowd-snapshots',      '*/5 * * * *',  $$select private.refresh_crowd_snapshots()$$);
select cron.schedule('crowd-forecast',       '0 3 * * *',    $$select private.refresh_crowd_forecast()$$);   -- 04:00 WAT
select cron.schedule('leaderboards',         '7 * * * *',    $$select private.refresh_leaderboards()$$);     -- hourly
select cron.schedule('sanctions-expiry',     '*/15 * * * *', $$select private.refresh_expired_sanctions()$$);
select cron.schedule('daily-purges',         '0 2 * * *',    $$select private.run_daily_purges()$$);         -- 03:00 WAT
select cron.schedule('partman-maintenance',  '30 2 * * *',   $$call extensions.run_maintenance_proc()$$);    -- activity_events partitions + 13-month retention
select cron.schedule('cron-history-cleanup', '15 2 * * *',   $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
