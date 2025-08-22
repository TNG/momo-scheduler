import { describe, expect, it, vi } from 'vitest';

import { MomoJobBuilder } from '../../src';

describe('MomoJobBuilder', () => {
  it('can build an interval job that never runs automatically', () => {
    const momoJob = new MomoJobBuilder()
      .withName('name')
      .withSchedule('never')
      .withConcurrency(1)
      .withMaxRunning(1)
      .withHandler(vi.fn())
      .withParameters({ foo: 'bar' })
      .withTimeout(1)
      .build();

    expect(momoJob.name).toEqual('name');
    expect(momoJob.schedule).toEqual({ interval: 'never' });
    expect(momoJob.concurrency).toEqual(1);
    expect(momoJob.maxRunning).toEqual(1);
    expect(momoJob.handler.toString()).toEqual(vi.fn().toString());
    expect(momoJob.parameters).toEqual({ foo: 'bar' });
    expect(momoJob.timeout).toEqual(1);
  });

  it('can build an interval job with all attributes and an interval', () => {
    const momoJob = new MomoJobBuilder()
      .withName('name')
      .withSchedule('one minute', 0)
      .withConcurrency(1)
      .withMaxRunning(1)
      .withHandler(vi.fn())
      .withParameters({ foo: 'bar' })
      .withTimeout(1)
      .build();

    expect(momoJob.name).toEqual('name');
    expect(momoJob.schedule).toEqual({ interval: 'one minute', firstRunAfter: 0 });
    expect(momoJob.concurrency).toEqual(1);
    expect(momoJob.maxRunning).toEqual(1);
    expect(momoJob.handler.toString()).toEqual(vi.fn().toString());
    expect(momoJob.parameters).toEqual({ foo: 'bar' });
    expect(momoJob.timeout).toEqual(1);
  });

  it('can build a cron job with all attributes', () => {
    const momoJob = new MomoJobBuilder()
      .withName('name')
      .withCronSchedule('0 9 * * 1-5')
      .withConcurrency(1)
      .withMaxRunning(1)
      .withHandler(vi.fn())
      .withParameters({ foo: 'bar' })
      .withTimeout(1)
      .build();

    expect(momoJob.name).toEqual('name');
    expect(momoJob.schedule).toEqual({ cronSchedule: '0 9 * * 1-5' });
    expect(momoJob.concurrency).toEqual(1);
    expect(momoJob.maxRunning).toEqual(1);
    expect(momoJob.handler.toString()).toEqual(vi.fn().toString());
    expect(momoJob.parameters).toEqual({ foo: 'bar' });
    expect(momoJob.timeout).toEqual(1);
  });

  it('can build an interval job with required attributes only', () => {
    const momoJobWithInterval = new MomoJobBuilder()
      .withName('name')
      .withSchedule('one minute')
      .withHandler(vi.fn())
      .build();

    expect(momoJobWithInterval.name).toEqual('name');
    expect(momoJobWithInterval.schedule).toEqual({ interval: 'one minute', firstRunAfter: 0 });
    expect(momoJobWithInterval.concurrency).toBeUndefined();
    expect(momoJobWithInterval.maxRunning).toBeUndefined();
    expect(momoJobWithInterval.handler.toString()).toEqual(vi.fn().toString());
  });

  it('can build an interval job with a number as interval', () => {
    const momoJobWithInterval = new MomoJobBuilder()
      .withName('name')
      .withSchedule(60 * 1000, 'two minutes')
      .withHandler(vi.fn())
      .build();

    expect(momoJobWithInterval.name).toEqual('name');
    expect(momoJobWithInterval.schedule).toEqual({ interval: 60000, firstRunAfter: 'two minutes' });
    expect(momoJobWithInterval.concurrency).toBeUndefined();
    expect(momoJobWithInterval.maxRunning).toBeUndefined();
    expect(momoJobWithInterval.handler.toString()).toEqual(vi.fn().toString());
  });

  it('can build an interval job with human readable firstRunAfter', () => {
    const momoJobWithInterval = new MomoJobBuilder()
      .withName('name')
      .withSchedule('one minute', 'two minutes')
      .withHandler(vi.fn())
      .build();

    expect(momoJobWithInterval.name).toEqual('name');
    expect(momoJobWithInterval.schedule).toEqual({ interval: 'one minute', firstRunAfter: 'two minutes' });
    expect(momoJobWithInterval.concurrency).toBeUndefined();
    expect(momoJobWithInterval.maxRunning).toBeUndefined();
    expect(momoJobWithInterval.handler.toString()).toEqual(vi.fn().toString());
  });

  it('can build a cron interval job with required attributes only', () => {
    const momoJobWithCronSchedule = new MomoJobBuilder()
      .withName('name')
      .withCronSchedule('0 9 * * 1-5')
      .withHandler(vi.fn())
      .build();

    expect(momoJobWithCronSchedule.name).toEqual('name');
    expect(momoJobWithCronSchedule.schedule).toEqual({ cronSchedule: '0 9 * * 1-5' });
    expect(momoJobWithCronSchedule.concurrency).toBeUndefined();
    expect(momoJobWithCronSchedule.maxRunning).toBeUndefined();
    expect(momoJobWithCronSchedule.handler.toString()).toEqual(vi.fn().toString());
  });

  it("cannot build if 'name' is not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withSchedule('one minute').withHandler(vi.fn());

    expect(() => momoJobBuilder.build()).toThrow('Error: Job must have a specified name');
  });

  it('cannot build if schedule is not specified', () => {
    const momoJobBuilder = new MomoJobBuilder().withName('name').withHandler(vi.fn());

    expect(() => momoJobBuilder.build()).toThrow('Error: Job must have a specified schedule');
  });

  it("cannot build if 'handler' is not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withName('name').withSchedule('one minute');

    expect(() => momoJobBuilder.build()).toThrow('Error: Job must have a specified handler');
  });
});
