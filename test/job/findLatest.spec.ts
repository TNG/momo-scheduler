import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { ExecutionInfo } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { findLatest } from '../../src/job/findLatest';

function createJob(lastFinished?: number): JobEntity {
  const job = { name: 'test' } as JobEntity;
  if (lastFinished !== undefined) {
    job.executionInfo = { lastFinished: DateTime.fromMillis(lastFinished).toISO() } as ExecutionInfo;
  }
  return job;
}

describe('findLatest', () => {
  it('handles empty array', () => {
    expect(findLatest([])).toBeUndefined();
  });

  it('handles single job', () => {
    const job = createJob(1);
    expect(findLatest([job])).toBe(job);
  });

  it('handles single job when job was never executed', () => {
    const job = createJob();
    expect(findLatest([job])).toBe(job);
  });

  it('finds index of latest job', () => {
    const job1 = createJob(1);
    const job2 = createJob(2);
    expect(findLatest([job1, job2])).toBe(job2);
    expect(findLatest([job2, job1])).toBe(job2);
  });

  it('finds index of latest job with equal time', () => {
    const job1 = createJob(1);
    const job2 = createJob(1);
    expect(findLatest([job1, job2])).toBe(job1);
  });

  it('finds index of latest job when job was never executed', () => {
    const job1 = createJob(1);
    const job2 = createJob();
    expect(findLatest([job1, job2])).toBe(job1);
    expect(findLatest([job2, job1])).toBe(job1);
  });

  it('finds index of latest job in bigger array', () => {
    const job0 = createJob();
    const job1 = createJob(1);
    const job2 = createJob(2);
    const job4 = createJob(4);
    const job5 = createJob(5);
    expect(findLatest([job4, job1, job1, job0, job5, job2])).toBe(job5);
  });
});
