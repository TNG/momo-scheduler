# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## Next release

## v1.0.0 (2022-07-07)
- Feature: job intervals can be given as a number or in human-readable format
- Feature: `firstRunAfter` can be given as a number or in human-readable format
- Feature: support cron jobs in addition to interval jobs
- Breaking: Remove `validate` method; this is replaced by `tryToJob`

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
