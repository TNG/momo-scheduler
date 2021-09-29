# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
