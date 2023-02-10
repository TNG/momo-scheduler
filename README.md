# Momo scheduler <img src="momo_logo.svg" align="right" />

Momo is a light-weight, easy-to-use scheduler that persists jobs in a MongoDB and supports interval-based scheduling as
well as cron jobs. In essence, it provides an easy way to tell your application to either "run that job every five
minutes" or "run that job at 9 AM every weekday".

## Features

- allows concurrent jobs
- allows immediate jobs
- supports long-running jobs
- allows error handling
- supports cluster mode (e.g. several instances using the same job database)
  - only one instance will actively schedule jobs
  - if an instance stops running, a different instance will take over the job scheduling

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
import { MongoSchedule, MomoJob, MomoJobBuilder, MomoErrorEvent, MomoEvent } from 'momo-scheduler';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoScheduleBuilder } from './MongoScheduleBuilder';

const mongo = await MongoMemoryServer.create();
const mongoSchedule = await new MongoScheduleBuilder()
  .withConnection({
    url: mongo.getUri(),
    collectionsPrefix: 'momo',
    pingIntervalMs: 10_000,
  })
  .build();

const intervalJob: MomoJob = new MomoJobBuilder()
  .withName('interval job')
  .withConcurrency(2)
  .withMaxRunning(3)
  .withSchedule('5 seconds')
  .withParameters({foo: 'bar'})
  .withHandler(() => console.log('This is a momo job that runs twice every five seconds!'))
  .build();
await mongoSchedule.define(intervalJob);

const cronJob: MomoJob = new MomoJobBuilder()
  .withName('cron job')
  .withConcurrency(1)
  .withMaxRunning(1)
  .withCronSchedule('0 0 * * 1-5')
  .withParameters({foo: {bar: "baz"}})
  .withHandler(() => console.log('This is a momo job that runs every weekday at midnight!'))
  .build();
await mongoSchedule.define(cronJob);

const cronJobWithNoParameters: MomoJob = new MomoJobBuilder()
  .withName('cron job without parameters')
  .withConcurrency(1)
  .withMaxRunning(3)
  .withCronSchedule('0 0 * * 1-3')
  .withHandler(() => console.log('This is a momo job that runs on Monday, Tuesday and Wednesday!'))
  .build();
await mongoSchedule.define(cronJobWithNoParameters);

// optional: listen to error and debug events
mongoSchedule.on('error', (error: MomoErrorEvent) => {
  /* handle error */
});
mongoSchedule.on('debug', (debug: MomoEvent) => {
  /* ... */
});

await mongoSchedule.start();

// all your application code...

// gracefully disconnect the scheduler
await mongoSchedule.disconnect();
```

### MomoJob

You can instantiate a momo job using the `MomoJobBuilder` class. It provides the following setter methods:

| setter           | parameters                                               | mandatory | default value | description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|------------------|----------------------------------------------------------|-----------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| withName         | `string`                                                 | true      |               | The name of the job. Used as a unique identifier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| withSchedule     | `number` or `string`,`number` or `string` (default: `0`) | false     |               | Either this setter or `withCronSchedule()` must be called. Specifies the schedule for starting the job. Time intervals can be given in human-readable formats (like '1 minute', 'ten days' or 'twenty-one days and 2 hours' ) or in milliseconds. Check the documentation of [ human-interval ](https://www.npmjs.com/package/human-interval) for details. If the job never ran before, the job will run after `firstRunAfter` for the first time. Just like the `interval`, `firstRunAfter` can also be given in a human-readable format or as milliseconds. |
| withCronSchedule | `string`                                                 | false     |               | Either this setter or `withCronSchedule()` must be called. Specifies the cron schedule according to which the job will run.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| withConcurrency  | `number`                                                 | false     | 1             | How many instances of a job are started at a time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| withMaxRunning   | `number`                                                 | false     | 0             | Maximum number of job executions that is allowed at a time. Set to 0 for no max. The schedule will trigger no more job executions if maxRunning is reached. However, there is no guarantee that the schedule always respects the limit; in rare cases with multiple Momo instances maxRunning may be exceeded.                                                                                                                                                                                                                                                |
| withHandler      | `function`                                               | true      |               | The function to execute.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| withParameters   | `JobParameters`                                          | false     |               | The parameters with which the function provided by `withHandler` is called.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### MongoSchedule

You can instantiate a mongo schedule using the `MongoScheduleBuilder` class. It provides the following setter
methods:

| setter         | parameters             | mandatory | default value | description                             |
|----------------|------------------------|-----------|---------------|-----------------------------------------|
| withJob        | `job: MomoJob`         | true      |               | Adds a job to the schedule.             |
| withConnection | `options: MomoOptions` | true      |               | The connection options of the schedule. |

The start/stop/cancel/remove methods can take a job's name as an optional parameter.
Only the job with the provided name is started/stopped/cancelled/removed.
If there is no job with this name on the schedule, nothing is done.
If the parameter is omitted, all jobs are started/stopped/cancelled/removed.

| function  | parameters                                                                                           | description                                                                                                                                                                                                                                                                                           |
|-----------|------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| connect   | `options: MomoConnectionOptions`                                                                     | Creates a new MongoSchedule connected to your database. See below for the available options.                                                                                                                                                                                                          |
| define    | `job: MomoJob`                                                                                       | Creates a new MomoJob on the schedule.                                                                                                                                                                                                                                                                |
| start     |                                                                                                      | Starts jobs that are on the schedule.                                                                                                                                                                                                                                                                 |
| stop      |                                                                                                      | Stops jobs, but does not remove them from either the schedule or the database.                                                                                                                                                                                                                        |
| cancel    |                                                                                                      | Stops and removes jobs from the schedule, does not remove them from the database.                                                                                                                                                                                                                     |
| remove    |                                                                                                      | Stops and removes jobs from both the schedule and the database.                                                                                                                                                                                                                                       |
| startJob  | `name: string`                                                                                       | Starts the job with the provided name (if on the schedule).                                                                                                                                                                                                                                           |
| stopJob   | `name: string`                                                                                       | Stops the job with the provided name (if on the schedule), but does not remove it from either the schedule or the database.                                                                                                                                                                           |
| cancelJob | `name: string`                                                                                       | Stops and removes the job with the provided name (if on the schedule) from the schedule, does not remove it from the database.                                                                                                                                                                        |
| removeJob | `name: string`                                                                                       | Stops and removes the job with the provided name (if on the schedule) from both the schedule and the database.                                                                                                                                                                                        |
| count     | `onlyStarted: boolean` (optional)                                                                    | Returns the number of jobs on the schedule. Only started jobs are counted if parameter is set to true.                                                                                                                                                                                                |
| list      |                                                                                                      | Returns descriptions of all jobs on the schedule.                                                                                                                                                                                                                                                     |
| check     | `name: string`                                                                                       | Returns execution information of the job with the provided name from the database. This also works if the job is not on the schedule.                                                                                                                                                                 |
| clear     |                                                                                                      | Removes all jobs from the database. This also removes jobs that are not on this schedule, but were defined by other schedules. However, does NOT stop job executions - this will cause currently running jobs to fail. Consider using stop/cancel/remove methods instead!                             |
| get       | `name: string`                                                                                       | Returns a description of the job. Returns undefined if no job with the provided name is defined.                                                                                                                                                                                                      |
| run       | `name: string`,  `parameters: JobParameters` (default: `undefined`),  `delay: number` (default: `0`) | Runs the job with the provided name once, independently from the schedule, after the specified delay.  If no parameters are provided, the job will be called with no parameters.  Note that `maxRunning` is respected, ie. the execution is skipped if the job is already running `maxRunning` times. |
| on        | `'debug'` or `'error'`, `function`                                                                   | Define a callback for debug or error events.                                                                                                                                                                                                                                                          |

#### MomoConnectionOptions

| property          | type     | optional | default   | description                                                                                                                                                                                                                                                 |
|-------------------|----------|----------|-----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| url               | `string` | false    |           | The connection string of your database.                                                                                                                                                                                                                     |
| collectionsPrefix | `string` | true     | no prefix | A prefix for all collections created by Momo.                                                                                                                                                                                                               |
| pingIntervalMs    | number   | true     | `60_000`  | The keep alive ping interval of the schedule, in milliseconds. After twice the amount of time has elapsed without a ping of your Momo instance, other instances would take over. You might want to reduce this if you have jobs running on short intervals. |

#### MomoJobDescription

The job description returned by the `list` and `get` functions of the `MongoSchedule` contains the following properties:

| property        | type                                    | optional | description                                                                                                                                                                                                                                                                                                   |
|-----------------|-----------------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
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
|-------|------------------|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| both  | message          | `string`                 | Some information about the event that occurred.                                                                                               |
| both  | data (optional)  | `{ name?: string; ... }` | Contains additional information like the name of the affected job.                                                                            |
| error | type             | `MomoErrorType`          | one of: `'defining job failed'`, `'scheduling job failed'`, `'executing job failed'`, `'stopping job failed'`, `'an internal error occurred'` |
| error | error (optional) | `Error`                  | The root cause of the error.                                                                                                                  |

### Job Examples

```typescript
import { MomoJobBuilder } from './MomoJobBuilder';

const example1 = new MomoJobBuilder()
  .withName('example 1')
  .withInterval('5 minutes')
  .withHandler(() => console.log('This is momo'))
  .build();

const example2 = new MomoJobBuilder()
  .withName('example 2')
  .withInterval('5 minutes', 60 * 1000) // first run after one minute
  .withHandler(() => console.log('This is momo'))
  .build();

const example3 = new MomoJobBuilder()
  .withName('example 3')
  .withInterval('5 minutes', '4 minutes') // first run after four minutes
  .withHandler(() => console.log('This is momo'))
  .build();

const example4 = new MomoJobBuilder()
  .withName('example 4')
  .withCronSchedule('0 0 * * 1-5') // every weekday at midnight
  .withHandler(() => console.log('This is momo'))
  .build();
```

Assume it is 12:00 AM when the MongoSchedule with these four example jobs is started.

- `example 1` will be run immediately, at 12:00, and then every five minutes. Adding `firstRunAfter: 0` explicitly is equivalent as this is the default value.
- `example 2` will be run after 1 minute (the configured `firstRunAfter`), at 12:01, and then every five minutes (next is 12:06).
- `example 3` will be run after 4 minutes (the configured `firstRunAfter`), at 12:04, and then every five minutes (next is 12:09).
- `example 4` will be run at midnight every weekday

Now assume the MongoSchedule is stopped at 12:02 and then immediately started again.

- `example 1` will be run 5 minutes (the configured `interval`) after the last execution, at 12:05. The job is NOT run immediately because it already ran before.
- `example 2` will be run 5 minutes (the configured `interval`) after the last execution, at 12:06. The job is NOT run after 1 minute (the configured `firstRunAfter`) because it already ran before.
- `example 3` will be run 4 minutes after the start (because of the configured `firstRunAfter`), at 12:06, because it never ran before, and then every five minutes (next is 12:11).
- `example 4` will be run at midnight every weekday

If your program is not running while a cron job should start, the missed run will not be started when your program
resumes. This is the case for interval jobs though. The benefit of cron jobs is, that you can control the exact time
of execution. They are also not restricted to a constant interval.

## Supported Node Versions

momo-scheduler supports node 14, 16 and 18.

## License

This project is open source and licensed under [Apache 2.0](LICENSE).

Licenses and Copyrights of dependencies can be found in [THIRD_PARTY_NOTICE](THIRD_PARTY_NOTICE) for the latest release.

For contribution guidelines see [CONTRIBUTING.md](CONTRIBUTING.md).
