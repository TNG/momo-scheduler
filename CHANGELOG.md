# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## v3.1.0 (2026-01-23)

- Feat: Add support for node 24
- Chore: Dependency updates

## v3.0.0 (2025-11-12)

- Feat: Add support for mongodb 7
- Feat: Configurable retries for schedule pings ([#1005](https://github.com/TNG/momo-scheduler/pull/1005); thank you [@StafanTNG](https://github.com/StefanTNG))
- Breaking: Remove support for mongodb 4
- Breaking: Remove support node 18

## v2.5.0 (2025-06-20)

- Feat: Add option to define jobs with `interval: 'never'` that are never started to run periodically but can be triggered to run once.
- Chore: Dependency updates

## v2.4.0 (2025-04-04)

- Feat: Recover from MongoDB errors during job execution by stopping and restarting the job after
  `timeout` ([#859](https://github.com/TNG/momo-scheduler/issues/859)). In order to make use of this feature, you must
  set the `timeout` when defining your job.
- Chore: Dependency updates

## v2.3.0 (2024-10-18)

- Feat: Add option to pass MongoClientOptions to momo ([#857](https://github.com/TNG/momo-scheduler/issues/857))
- Feat: Add index for scheduleId column ([#839](https://github.com/TNG/momo-scheduler/issues/839))
- Chore: Dependency updates

## v2.2.0 (2024-09-13)

- Chore: Dependency updates

## v2.1.1 (2024-07-22)

- Chore: Dependency updates

## v2.1.0 (2024-02-16)

- Feat: handle improper error objects (like null, undefined ...) returned from jobs
  gracefully ([#720](https://github.com/TNG/momo-scheduler/issues/720))

## v2.0.4 (2023-12-01)

- Fix: maxRunning is now always respected, also for longer running
  jobs ([#706](https://github.com/TNG/momo-scheduler/issues/706))

## v2.0.3 (2023-10-20)

- Fix: remove error spam when checking for active schedules ([#624](https://github.com/TNG/momo-scheduler/issues/624))

## v2.0.2 (2023-09-15)

- Fix: prevent a race condition when starting jobs ([#603](https://github.com/TNG/momo-scheduler/issues/603)
  and [#604](https://github.com/TNG/momo-scheduler/issues/604))
- Chore: add [mongodb](https://www.npmjs.com/package/mongodb) v6 support

## v2.0.1 (2023-06-12)

- Fix: fixed [CVE](https://github.com/advisories/GHSA-6w63-h3fj-q4vw)
  in [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)

## v2.0.0 (2023-05-12)

- Feature: only one schedule with a given name can be active at the same time
    - if an instance stops running, a different instance will take over the job scheduling
- Fix: Fixed the usage to mongo collection prefixes
- Breaking: dropped Node 14 support (still works with node 14 though)
- Breaking: Removed `executions` collection and use `schedules` collection
- Breaking: Schedules need a name now
- Breaking: Removed `startJob`, `stopJob`, `cancelJob`, and `removeJob` from the schedule

## v1.1.1 (2023-01-11)

- Fix: Dependency upgrades (
  fix [CVE-2023-22467](https://github.com/moment/luxon/security/advisories/GHSA-3xq5-wjfh-ppjc))

## v1.1.0 (2022-09-29)

- Feature: jobs can receive parameters ([#405](https://github.com/TNG/momo-scheduler/issues/405))

## v1.0.0 (2022-07-11)

- Feature: `interval` can be given as a number or in human-readable format
- Feature: `firstRunAfter` can be given as a number or in human-readable format
- Feature: support cron jobs in addition to interval jobs
- Breaking: Remove `validate` method; it's replaced by `tryToJob`
- Breaking: `MomoJobBuilder::withInterval` -> `MomoJobBuilder::withSchedule`
- Breaking: Removed `MomoJobBuilder::withFirstRunAfter`; now part of `MomoJobBuilder::withSchedule`

## v0.4.1 (2021-11-02)

- Fix: catch exceptions thrown by momo's internal ping

## v0.4.0 (2021-10-07)

- Feature: schedule a job to run with delay (option `firstRunAfter`)
- Feature: offer configuration for a prefix of all used collections (`collectionsPrefix`)
- Feature: the ping interval that momo instances need to keep their executions valid is now configurable
- Breaking: `immediate` was removed; instead, set `firstRunAfter` to `0` for immediate execution
- Breaking: dropped Node 10 support

## v0.3.0 (2021-09-29)

- Feature: compatibility with mongodb v4 (removed typeorm dependency)
- Breaking: moved utility functions into classes
    - `check` and `clear` are now part of the `Schedule`

## v0.2.0 (2021-07-16)

- Feature: builder pattern for schedules and jobs
- Fix: remove stale executions from db
- Fix: fix removal of all jobs from the schedule
- Fix: fix log statement after scheduling a job
- Breaking: split API to start/stop/cancel/remove jobs into functions to handle a specific job and to handle all jobs
- Breaking: API to list jobs or get a single job now return job descriptions instead of the job itself

## v0.1.0 (2021-07-05)

- initial release
