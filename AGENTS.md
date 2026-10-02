# AGENTS.md

Coding conventions for the momo-scheduler repository.

## Build & Verification Commands

```bash
npm run build          # Compile TypeScript (tsc)
npm run lint           # Biome lint check (CI mode)
npm run format         # Biome format + lint --write
npm run test           # Run all tests (Vitest)
npm run test:unit      # Unit tests only (excludes *.integration.spec.ts)
npm run test:integration  # Integration tests only
```

Always run `npm run lint` and `npm run build` after making changes.

## Project Overview

momo-scheduler is a TypeScript library that persists scheduled jobs in MongoDB. It supports interval-based and
cron-based scheduling, concurrency, cluster mode, and graceful error recovery. Public API surface is exported from
`src/index.ts`.

## Tech Stack

- **Language**: TypeScript 5.x (strict mode, ES6 target, CommonJS modules)
- **Runtime**: Node.js >= 20
- **Database**: MongoDB (peer dependency: mongodb 5 || 6 || 7)
- **Testing**: Vitest + ts-mockito + @sinonjs/fake-timers + mongodb-memory-server
- **Linting/Formatting**: Biome (not ESLint/Prettier)
- **Key Libraries**: neverthrow (Result type), luxon (dates), lodash (utils), uuid (identifiers), typed-emitter (typed
  events), cron/cron-parser

## TypeScript Configuration

- `strict: true`, `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `import type` for type-only imports; inline `type` keyword in mixed imports
- No path aliases — use relative imports only

## Naming Conventions

| Element                      | Convention                                                          | Examples                                                |
|------------------------------|---------------------------------------------------------------------|---------------------------------------------------------|
| Class files                  | PascalCase                                                          | `MomoJobBuilder.ts`, `JobScheduler.ts`, `LogEmitter.ts` |
| Non-class files              | camelCase                                                           | `findLatest.ts`, `safeTimeouts.ts`                      |
| Classes                      | PascalCase, `Momo` prefix for public API                            | `MomoJobBuilder`, `MongoSchedule`, `MomoError`          |
| Interfaces                   | PascalCase, no `I` prefix                                           | `MomoJob`, `Logger`, `Handler`                          |
| Interface suffixes           | `Entity`, `Options`, `Description`, `Status`, `Parameters`, `Event` | `JobEntity`, `MomoOptions`, `MomoJobDescription`        |
| Enums                        | PascalCase name, camelCase members                                  | `ExecutionStatus.finished`, `MomoErrorType.defineJob`   |
| Functions/variables          | camelCase                                                           | `tryToJob()`, `findLatest()`, `jobSchedulers`           |
| Type guard functions         | `is` prefix                                                         | `isCronSchedule()`, `isNeverJob()`                      |
| Conversion functions         | `to` prefix                                                         | `toSchedule()`, `toMomoJobDescription()`                |
| Validation functions         | `try` prefix                                                        | `tryToJob()`, `tryToIntervalJob()`                      |
| Constants (collection names) | SCREAMING_SNAKE_CASE                                                | `JOBS_COLLECTION_NAME`, `SCHEDULES_COLLECTION_NAME`     |
| Constants (other)            | camelCase                                                           | `maxNodeTimeoutDelay`, `duplicateKeyErrorCode`          |

## File & Module Structure

```
src/
  index.ts          # Barrel file — re-exports all public API; contains luxon Settings init
  Connection.ts     # MongoDB connection management
  job/              # Job domain: types, validation, builder (no DB, no scheduling)
  schedule/         # Orchestration: MongoSchedule, Schedule, SchedulePing, builder
  scheduler/        # Scheduling mechanics: JobScheduler, ExecutableSchedule implementations
  executor/         # Job execution: JobExecutor
  repository/       # MongoDB data access: Repository<T>, JobRepository, SchedulesRepository, entities
  logging/          # Cross-cutting: Logger interface, LogEmitter, MomoEvents, error types
  timeout/          # Safe timeout/interval wrappers
test/               # Mirrors src/ structure
  utils/            # Test helpers (sleep, waitFor, logging)
```

## Export Patterns

- **Named exports only** — no default exports anywhere
- Single barrel file at `src/index.ts` using `export { ... } from '...'`
- Internal modules import directly from each other (no re-exports)

## Error Handling

### Primary: neverthrow Result Type

Validation and conversion functions return `Result<T, Error>`:

```typescript
export function tryToJob(momoJob: MomoJob): Result<Job, Error> {
  if (maxRunning !== undefined && maxRunning < 0) {
    return err(momoError.invalidMaxRunning);
  }
  return ok({ ...momoJob, schedule });
}
```

Callers check with `isErr()` / `isOk()`. In tests, use `_unsafeUnwrap()` on expected-ok results.

### Predefined Errors: momoError Object

Frozen object of predefined `Error` instances (not thrown, used as Result error values):

```typescript
export const momoError = {
  nonParsableInterval: new Error('non-parsable job interval'),
  invalidConcurrency: new Error('concurrency must be at least 1 but not greater than maxRunning'),
  // ...
};
```

### try/catch: Specific Cases Only

- Parsing external library calls that throw (cron-parser)
- Fire-and-forget operations with error logging
- MongoServerError handling with error code checks
- Safe timeout/interval wrappers catching async callback errors

### Error Events (Not Thrown)

Errors in the running scheduler are logged via `logger.error()` which emits `'error'` events on the EventEmitter.
Consumers subscribe: `mongoSchedule.on('error', handler)`.

## Type Patterns

- **Interface-first design** — data shapes are interfaces, not classes
- **Discriminated unions** — `MomoJob` is
  `TypedMomoJob<IntervalSchedule> | TypedMomoJob<CronSchedule> | TypedMomoJob<NeverSchedule>`
- **Type guards** narrow unions: `isCronJob()`, `isNeverJob()`, `isCronSchedule()`, `isNeverSchedule()`
- **Generic repository**: `Repository<ENTITY extends { _id?: ObjectId }>`
- **Job types parameterized by schedule**: `Job<Schedule>`, `JobDefinition<Schedule>`, `JobEntity<Schedule>`
- **Enums** for finite known sets: `ExecutionStatus`, `MomoErrorType`, `StartJobsStatus`
- **No `readonly`** on interface properties
- **`Omit`** used for type reshaping: `MomoJobStatus extends Omit<JobEntity<never>, '_id' | 'schedule'>`

## Class Patterns

- **Private constructors** with static async factory methods for classes requiring async init:
  ```typescript
  private constructor(...) {}
  public static async connect(options: MomoOptions): Promise<MongoSchedule> { ... }
  ```
- **Constructor injection** for dependencies; `private readonly` for injected deps and internal state
- **`protected readonly`** for properties shared with subclasses
- **`public`** explicitly stated on public API methods
- **Static factory methods** wire up dependencies:
  ```typescript
  static forJob(job, logger, schedulesRepo, jobRepo): JobScheduler { ... }
  ```
- **Composition over inheritance** — `JobScheduler` composes `JobExecutor`; inheritance chain is
  `MongoSchedule extends Schedule extends LogEmitter` only

## Builder Pattern

- **Fluent API** returning `this` for method chaining
- **Type narrowing** through return types (e.g., `withSchedule()` returns `MomoIntervalJobBuilder`)
- **`build()` throws `Error`** for missing required fields (sync for `MomoJobBuilder`, async for `MongoScheduleBuilder`)
- Build error message format: `'Error: ...'`

## Async Patterns

- **async/await throughout** — no raw `.then()` / `.catch()` chains
- **`Promise.all`** for parallel independent async operations
- **Fire-and-forget** with `void` prefix and `.catch()`:
  ```typescript
  void this.jobExecutor.execute(jobEntity, parameters).catch(async (e) => { ... });
  ```
- **Safe timeout/interval wrappers** that catch errors in async callbacks

## Logging

- **Logger interface** (not a class) with only `debug` and `error` levels
- **Structured data** via `MomoEventData` dictionary: `{ [key: string]: boolean | number | string | undefined }`
- **LogEmitter** base class provides `logger` property; `debug`/`error` functions emit typed events
- Signature: `error(message, type: MomoErrorType, data?, error?)` / `debug(message, data?)`

## Event Patterns

- **typed-emitter** for type-safe events: `TypedEmitter<MomoEvents>`
- Two event types: `'debug'` and `'error'`
- `MomoEvent`: `{ message, data? }`
- `MomoErrorEvent`: `{ message, type: MomoErrorType, data?, error? }`

## MongoDB Patterns

- **Repository pattern**: generic `Repository<T>` base with specialized `JobRepository` and `SchedulesRepository`
- **Collection name constants**: `JOBS_COLLECTION_NAME`, `SCHEDULES_COLLECTION_NAME` with optional prefix
- **Null-to-undefined mapping**: MongoDB `null` values mapped to `undefined`
- **`cloneDeep` on save**: `insertOne` mutates entities (adds `_id`), so `cloneDeep` is used
- **Atomic operations**: `findOneAndUpdate` with `$inc` for concurrent-safe counting
- **Explicit index creation** in `Connection.create()`

## Numeric Literals

- **Underscore separators** for large numbers: `60_000`, `300_000`, `10_000`
- **Max timeout constant**: `maxNodeTimeoutDelay = 2147483647`
- **Milliseconds as standard unit**; human-readable strings also accepted for intervals
- In tests, arithmetic expressions are acceptable for clarity: `60 * 1000`

## Test Conventions

- **Framework**: Vitest
- **Unit test files**: `*.spec.ts`
- **Integration test files**: `*.integration.spec.ts`
- **Test directory** mirrors `src/` structure
- **Mocking**: `ts-mockito` for classes (`mock`, `when`, `instance`, `verify`, `capture`, `anything`, `deepEqual`)
- **Function mocks**: `vi.fn()` for handlers, callbacks, spies
- **Module mocks**: `vi.mock()` used sparingly
- **Test logger**: `pino` for debug output + `vi.fn()` spies for assertions
- **Integration tests**: `MongoMemoryServer` for in-memory DB; unique job names via `uuid()`
- **Cleanup**: `afterEach` disconnects schedules and connections; `beforeEach` calls `vi.clearAllMocks()`
- **Async assertions**: use `waitFor()` helper (polling-based)
- **Biome suppressions in tests**:
  `// biome-ignore-all lint/style/noNonNullAssertion: using null assertion in tests is fine`
- **Test timeout**: `vi.setConfig({ testTimeout: 10_000 })` for integration tests

## Documentation

- **JSDoc on all public API methods** with `@param`, `@returns`, `@throws` tags
- Multi-line doc comments explaining edge cases and behavior
- **No JSDoc on interfaces/types** unless semantics are non-obvious
- **Inline comments** used sparingly for important context only
- No code comments unless asked

## Import Organization

Enforced by Biome auto-organize:

1. Node built-ins (prefixed `node:`)
2. External packages
3. Internal modules (relative paths)

Blank line between groups. `import type` for type-only imports.

## Agent Rules

When making major changes to this repository (new features, refactoring, changed public API, added/removed modules), you MUST ask the user whether the following should be updated to reflect the changes:

- **AGENTS.md** — if coding conventions, module structure, naming patterns, or build/verification commands are affected
- **README.md** — if the public API, usage examples, or feature list is affected
- **CONTRIBUTING.md** — if contributor workflow or project setup is affected
- **JSDoc** — if public method signatures or behavior change

Do NOT update these files without explicit user approval.

## Formatting (Biome)

- Single quotes
- Space indentation
- No semicolons (not enforced by Biome but observed in codebase — follow existing file style)
