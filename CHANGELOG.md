# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## v2.0.1 (2023-06-12)

- Fix: Fixed [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) [CVE](https://github.com/advisories/GHSA-6w63-h3fj-q4vw)

## v2.0.0 (2023-05-12)
- Feature: only one schedule with a given name can be active at the same time
  - if an instance stops running, a different instance will take over the job scheduling
- Fix: Fixed the usage to mongo collection prefixes
- Breaking: dropped Node 14 support (still works with node 14 though)
- Breaking: Removed `executions` collection and use `schedules` collection
- Breaking: Schedules need a name now
- Breaking: Removed `startJob`, `stopJob`, `cancelJob`, and `removeJob` from the schedule

## v1.1.1 (2023-01-11)
- Fix: Dependency upgrades (fix [CVE-2023-22467](https://github.com/moment/luxon/security/advisories/GHSA-3xq5-wjfh-ppjc))

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
