# CloudWatch DAU test

Publishes one `TigerType / DailyActiveUsers` count for yesterday in Eastern Time
(EST/EDT). Uses the same activity sources as Grafana: races, timed results,
partial sessions, and latest login. Each user counts once. Latest login is
overwritten, so login-only activity can be missed. The point is timestamped
at 23:59:59 Eastern on the measured day, then published after midnight.

Use the app's database config (`DATABASE_URL` with `NODE_ENV=production`, or
local `DB_*` settings) and AWS credentials with `cloudwatch:PutMetricData`
permission for the `TigerType` namespace.

```sh
npm run monitoring:dau -- --dry-run  # Query and print only
npm run monitoring:dau              # Query and send to CloudWatch
```

In CloudWatch, select region **us-east-1**, namespace **TigerType**, metric
**DailyActiveUsers**, period **1 day**, statistic **Maximum**. Allow time for
the first point to appear. Set `CLOUDWATCH_REGION` to use another region.

For daily collection, add `npm run monitoring:dau` to Heroku Scheduler with
frequency **Daily** at **05:15 UTC** (after New York midnight year-round).
The job uses the app's config vars. Scheduling is not configured by this script.
