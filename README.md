# momo-scheduler <img src="momo_logo.svg" align="right" />

momo is a scheduler that persists jobs in MongoDB.

## Features

* allows concurrent jobs
* allows immediate jobs
* supports long-running jobs
* allows error handling
* allows updating jobs during runtime
* supports cluster mode (e.g. several services using the same job database)

## Usage

```
import { MongoSchedule, MomoJob, MomoErrorEvent, MomoEvent } from 'momo-scheduler';
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
const mongoSchedule = await MongoSchedule.connect({ url: await mongo.getUri() });

const job: MomoJob = { name: 'momo test', interval: '1 minute', handler: () => console.log('This is momo') };
await mongoSchedule.define(job);

// optional: listen to error and debug events
mongoSchedule.on('error', (error: MomoErrorEvent) => { /* handle error */ });
mongoSchedule.on('debug', (debug: MomoEvent) => { /* ... */ });

await mongoSchedule.start();

// ...

await mongoSchedule.disconnect();
```

### MomoJob

| property    | type     | optional | default | description |
|-------------|----------|----------|---------|-------------|
| name        | `string`   | false    |         | The name of the job. Used as a unique identifier. |
| interval    | `string`   | false    |         | Specifies the time interval at which the job is started. Time intervals in human-readable formats (like '1 minute', 'ten days' or 'twenty-one days and 2 hours') are accepted. Check documentation of [human-interval](https://www.npmjs.com/package/human-interval) library for details. | 
| immediate   | `boolean`  | true     | `false`   | If set to true AND the job was never run before, the job will be started immediately after start. |
| concurrency | `number`   | true     | `1`       | How many instances of a job are started at a time. |
| maxRunning  | `number`   | true     | `0`       | Maximum number of job executions that is allowed at a time. Set to 0 for no max. The job will not be started anymore if maxRunning is reached. |
| handler     | `function` | false    |         | The function to execute. |

### MongoSchedule

The start/stop/cancel/remove methods can take a job's name as an optional parameter.
Only the job with the provided name is started/stopped/cancelled/removed.
If there is no job with this name on the schedule, nothing is done.
If the parameter is omitted, all jobs are started/stopped/cancelled/removed.

| function   | parameters            | description |
|------------|-----------------------|-------------|
| define     | `MomoJob`             | Creates a new MomoJob on the schedule. |
| start      | `string` (optional)   | Starts jobs that are on the schedule. |
| stop       | `string` (optional)   | Stops jobs, but does not remove them from either the schedule or the database. |
| cancel     | `string` (optional)   | Stops and removes jobs from the schedule, does not remove them from the database. |
| remove     | `string` (optional)   | Stops and removes jobs from both the schedule and the database. |
| count      | `boolean` (optional)  | Returns the number of jobs on the schedule. Only started jobs are counted if parameter is set to true. |
| list       |                       | Returns all jobs on the schedule. |
| get        | `string`              | Returns the job. Returns undefined if no job with the provided name is defined. |
| run        | `string`              | Runs the job with the provided name once, immediately. Note that `maxRunning` is respected, ie. the execution is skipped if the job is already running `maxRunning` times. |
| on         | `'debug'` or `'error'`, `function` | Define a callback for debug or error events. |

The MongoSchedule is an EventEmitter, emitting `'debug'` and `'error'` events.
You can define callbacks to handle them:

```
mongoSchedule.on('error', ({ error, data, message, type }: MomoErrorEvent) => {
  console.log(`An error of type ${type} occurred`, { error, data, message });
});

mongoSchedule.on('debug', ({ data, message }: MomoEvent) => {
  console.log('A debug event occurred', { data, message });
});
```

### MomoEvent and MomoErrorEvent

| event | property                | type                     | description |
|-------|-------------------------|--------------------------|-------------|
| both  | message                 | `string`                 | Some information about the event that occurred. |
| both  | data (optional)         | `{ name?: string; ... }` | Contains additional information like the name of the affected job. |
| error | type                    | `MomoErrorType`          | `'defining job failed'` or `'scheduling job failed'` or `'executing job failed'` |
| error | error (optional)        | `Error`                  | The root cause of the error. |

### Other functions

momo-scheduler also includes some utility functions to retrieve information on momo jobs from its database:

| function      | parameter | description |
|---------------|-----------|-------------|
| `connect`     | `{ url: string }` | Establishes a connection with MongoDB. If you want to schedule jobs, you should use `MongoSchedule.connect` instead to create a connected schedule. |
| `isConnected` |           | Returns true if a connection to MongoDB was established and false otherwise. | 
| `check`       | `string`  | Retrieves information on the last job execution. Returns undefined if job cannot be found or was never executed. |
| `list`        |           | Lists all jobs. |
| `clear`       |           | Removes all jobs from the database. Do not use this if MongoSchedule has already been started. Subsequent execution of all jobs will fail! | 

## License

This project is open source and licensed under [Apache 2.0](LICENSE).

Licenses and Copyrights of dependencies can be found in [NOTICE.third-party](NOTICE.third-party) for the latest release.

For contribution guidelines see [CONTRIBUTING.md](CONTRIBUTING.md).
