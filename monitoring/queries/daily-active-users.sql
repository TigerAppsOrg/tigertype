-- App activity columns are TIMESTAMP WITHOUT TIME ZONE in New York time.
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
  SELECT id AS user_id FROM users, bounds
  WHERE last_login >= day_end - interval '1 day' AND last_login < day_end
)
SELECT COUNT(DISTINCT user_id)::integer AS value,
       ((SELECT day_end FROM bounds) - interval '1 day')::date::text AS day,
       ((SELECT day_end FROM bounds) AT TIME ZONE 'America/New_York')
         - interval '1 second' AS timestamp
FROM activity;
