-- Session timestamps are New York local time; login events include timezone.
-- Count the previous completed calendar day, with each user counted once.
WITH bounds AS (
  SELECT date_trunc('day', now() AT TIME ZONE 'America/New_York') AS day_end
), activity AS (
  SELECT user_id FROM race_results, bounds
  WHERE created_at >= day_end - interval '1 day' AND created_at < day_end
  UNION
  SELECT user_id FROM timed_leaderboard, bounds
  WHERE created_at >= day_end - interval '1 day' AND created_at < day_end
  UNION
  SELECT user_id FROM partial_sessions, bounds
  WHERE created_at >= day_end - interval '1 day' AND created_at < day_end
  UNION
  SELECT user_id FROM login_events, bounds
  WHERE logged_in_at >= ((day_end - interval '1 day') AT TIME ZONE 'America/New_York')
    AND logged_in_at < (day_end AT TIME ZONE 'America/New_York')
)
SELECT COUNT(DISTINCT user_id)::integer AS value,
       ((SELECT day_end FROM bounds) - interval '1 day')::date::text AS day,
       ((SELECT day_end FROM bounds) AT TIME ZONE 'America/New_York')
         - interval '1 second' AS timestamp
FROM activity;
