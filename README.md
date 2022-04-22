# momo-scheduler <img src="momo_logo.svg" align="right" />

momo is a light-weight, easy-to-use interval-based scheduler that persists jobs in a MongoDB.

In essence, it provides an easy way to tell your application to "run that job every five minutes".

## Features

- allows concurrent jobs
- allows immediate jobs
- supports long-running jobs
- allows error handling
- allows updating jobs during runtime
- supports cluster mode (e.g. several services using the same job database)

## Installation

Install via npm:

```
npm install @tngtech/momo-scheduler
```

or yarn:

```
yarn add @tngtech/momo-scheduler
```

You're all set!

## Usage

```typescript
import { MongoSchedule, MomoJob, MomoErrorEvent, MomoEvent } from 'momo-scheduler';
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
const mongoSchedule = await MongoSchedule.connect({ url: await mongo.getUri() });

const job: MomoJob = { name: 'momo test', interval: '1 minute', handler: () => console.log('This is momo') };
await mongoSchedule.define(job);

// optional: listen to error and debug events
mongoSchedule.on('error', (error: MomoErrorEvent) => {
  /* handle error */
});
mongoSchedule.on('debug', (debug: MomoEvent) => {
  /* ... */
});

await mongoSchedule.start();

// ...

await mongoSchedule.disconnect();
```

### MomoJob

| property      | type       | optional | default | description                                                                                                                                                                                                                                                                                                    |
| ------------- | ---------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name          | `string`   | false    |         | The name of the job. Used as a unique identifier.                                                                                                                                                                                                                                                              |
| interval      | `string`   | false    |         | Specifies the time interval at which the job is started. Time intervals in human-readable formats (like '1 minute', 'ten days' or 'twenty-one days and 2 hours') are accepted. Check documentation of [human-interval](https://www.npmjs.com/package/human-interval) library for details.                      |
| firstRunAfter | `number`   | true     | `0`     | If the job never ran before, the job will run after `firstRunAfter` milliseconds for the first time.                                                                                                                                                                                                           |
| concurrency   | `number`   | true     | `1`     | How many instances of a job are started at a time.                                                                                                                                                                                                                                                             |
| maxRunning    | `number`   | true     | `0`     | Maximum number of job executions that is allowed at a time. Set to 0 for no max. The schedule will trigger no more job executions if maxRunning is reached. However, there is no guarantee that the schedule always respects the limit; in rare cases with multiple Momo instances maxRunning may be exceeded. |
| handler       | `function` | false    |         | The function to execute.                                                                                                                                                                                                                                                                                       |

### MongoSchedule

The start/stop/cancel/remove methods can take a job's name as an optional parameter.
Only the job with the provided name is started/stopped/cancelled/removed.
If there is no job with this name on the schedule, nothing is done.
If the parameter is omitted, all jobs are started/stopped/cancelled/removed.

| function  | parameters                         | description                                                                                                                                                                                                                                                               |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| connect   | `MomoConnectionOptions`            | Creates a new MongoSchedule connected to your database. See below for the available options.                                                                                                                                                                              |
| define    | `MomoJob`                          | Creates a new MomoJob on the schedule.                                                                                                                                                                                                                                    |
| start     |                                    | Starts jobs that are on the schedule.                                                                                                                                                                                                                                     |
| stop      |                                    | Stops jobs, but does not remove them from either the schedule or the database.                                                                                                                                                                                            |
| cancel    |                                    | Stops and removes jobs from the schedule, does not remove them from the database.                                                                                                                                                                                         |
| remove    |                                    | Stops and removes jobs from both the schedule and the database.                                                                                                                                                                                                           |
| startJob  | `string`                           | Starts the job with the provided name (if on the schedule).                                                                                                                                                                                                               |
| stopJob   | `string`                           | Stops the job with the provided name (if on the schedule), but does not remove it from either the schedule or the database.                                                                                                                                               |
| cancelJob | `string`                           | Stops and removes the job with the provided name (if on the schedule) from the schedule, does not remove it from the database.                                                                                                                                            |
| removeJob | `string`                           | Stops and removes the job with the provided name (if on the schedule) from both the schedule and the database.                                                                                                                                                            |
| count     | `boolean` (optional)               | Returns the number of jobs on the schedule. Only started jobs are counted if parameter is set to true.                                                                                                                                                                    |
| list      |                                    | Returns descriptions of all jobs on the schedule.                                                                                                                                                                                                                         |
| check     | `string`                           | Returns execution information of the job with the provided name from the database. This also works if the job is not on the schedule.                                                                                                                                     |
| clear     |                                    | Removes all jobs from the database. This also removes jobs that are not on this schedule, but were defined by other schedules. However, does NOT stop job executions - this will cause currently running jobs to fail. Consider using stop/cancel/remove methods instead! |
| get       | `string`                           | Returns a description of the job. Returns undefined if no job with the provided name is defined.                                                                                                                                                                          |
| run       | `string`, `number` (default: `0`)  | Runs the job with the provided name once, independently from the schedule, after the specified delay. Note that `maxRunning` is respected, ie. the execution is skipped if the job is already running `maxRunning` times.                                                 |
| on        | `'debug'` or `'error'`, `function` | Define a callback for debug or error events.                                                                                                                                                                                                                              |

#### MomoConnectionOptions

| property          | type     | optional | default   | description                                                                                                                                                                                                                                                          |
| ----------------- | -------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| url               | `string` | false    |           | The connection string of your database.                                                                                                                                                                                                                              |
| collectionsPrefix | `string` | true     | no prefix | A prefix for all collections created by Momo.                                                                                                                                                                                                                        |
| pingInterval      | number   | true     | `60`      | The keep alive ping interval of the schedule, in seconds. After twice the amount of time has elapsed without a ping of your Momo instance, stale job executions are considered dead. You might want to reduce this if you have jobs running on very short intervals. |

#### MomoJobDescription

The job description returned by the `list` and `get` functions of the `MongoSchedule` contains the following properties:

| property        | type                                    | optional | description                                                                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name            | `string`                                | false    | The name of the job. Used as a unique identifier.                                                                                                                                                                                                                                                             |
| interval        | `string`                                | false    | Specifies the time interval at which the job is started.                                                                                                                                                                                                                                                      |
| concurrency     | `number`                                | false    | How many instances of a job are started at a time.                                                                                                                                                                                                                                                            |
| maxRunning      | `number`                                | false    | Maximum number of job executions that is allowed at a time. Set to 0 for no max. The job will not be started anymore if maxRunning is reached.                                                                                                                                                                |
| schedulerStatus | `{ interval: string, running: number }` | true     | Only present if the job was started, reports the number of currently running executions of the job and the time interval at which job execution is triggered. This might differ from the top-level `interval` as the interval of an already started job is not changed automatically when the job is updated. |

The MongoSchedule is an EventEmitter, emitting `'debug'` and `'error'` events.
You can define callbacks to handle them:

```typescript
mongoSchedule.on('error', ({ error, data, message, type }: MomoErrorEvent) => {
  console.log(`An error of type ${type} occurred`, { error, data, message });
});

mongoSchedule.on('debug', ({ data, message }: MomoEvent) => {
  console.log('A debug event occurred', { data, message });
});
```

### MomoEvent and MomoErrorEvent

| event | property         | type                     | description                                                                                                                                   |
| ----- | ---------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| both  | message          | `string`                 | Some information about the event that occurred.                                                                                               |
| both  | data (optional)  | `{ name?: string; ... }` | Contains additional information like the name of the affected job.                                                                            |
| error | type             | `MomoErrorType`          | one of: `'defining job failed'`, `'scheduling job failed'`, `'executing job failed'`, `'stopping job failed'`, `'an internal error occurred'` |
| error | error (optional) | `Error`                  | The root cause of the error.                                                                                                                  |

### Job Examples

```
const example1: MomoJob = {
  name: 'example 1',
  interval: '5 minutes',
  firstRunAfter: 0,
  handler: () => console.log('This is momo'),
};

const example2: MomoJob = {
  name: 'example 2',
  interval: '5 minutes',
  handler: () => console.log('This is momo'),
};

const example3: MomoJob = {
  name: 'example 3',
  interval: '5 minutes',
  firstRunAfter: 60 * 1000, // 1 minute
  handler: () => console.log('This is momo'),
};

const example4: MomoJob = {
  name: 'example 4',
  interval: '5 minutes',
  firstRunAfter: 5 * 60 * 1000, // 5 minutes
  handler: () => console.log('This is momo'),
};

const example5: MomoJob = {
  name: 'example 5',
  interval: '5 minutes',
  firstRunAfter: 10 * 60 * 1000, // 10 minutes
  handler: () => console.log('This is momo'),
};
```

Assume it is 12:00 AM when the MongoSchedule with these five example jobs is started.

- `example 1` and `example 2` are equivalent, since `firstRunAfter` defaults to `0`. They will be run immediately, at 12:00, and then every five minutes.
- `example 3` will be run after 1 minute (the configured `firstRunAfter`), at 12:01, and then every five minutes.
- `example 4` will be run after 5 minutes (the configured `firstRunAfter`), at 12:05, and then every five minutes.
- `example 5` will be run after 10 minutes (the configured `firstRunAfter`), at 12:10, and then every five minutes.

Now assume the MongoSchedule is stopped at 12:02 and then immediately started again.

- `example 1` and `example 2` will be run 5 minutes (the configured `interval`) after the last execution, at 12:05. They are NOT run immediately because they already ran before.
- `example 3` will be run 5 minutes (the configured `interval`) after the last execution, at 12:06. The job is NOT run after 1 minute (the configured `firstRunAfter`) because it already ran before.
- `example 4` will be run 5 minutes (the configured `firstRunAfter`) after the start, at 12:07, because it never ran before, and then every five minutes.
- `example 5` will be run 10 minutes (the configured `firstRunAfter`)  after the start, at 12:12, because it never ran before, and then every five minutes.

## Supported Node Versions

momo-scheduler supports node 12, 14 and 16.

## License

This project is open source and licensed under [Apache 2.0](LICENSE).

Licenses and Copyrights of dependencies can be found in [THIRD_PARTY_NOTICE](THIRD_PARTY_NOTICE) for the latest release.

For contribution guidelines see [CONTRIBUTING.md](CONTRIBUTING.md).
