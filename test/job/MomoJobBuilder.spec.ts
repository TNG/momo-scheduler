import { MomoJobBuilder } from '../../src/job/MomoJobBuilder';

describe('MomoJobBuilder', () => {
  it('can build a job with all attributes and an interval', () => {
    const momoJob = new MomoJobBuilder()
      .withName('name')
      .withInterval('one minute')
      .withFirstRunAfter(0)
      .withConcurrency(1)
      .withMaxRunning(1)
      .withHandler(jest.fn())
      .build();

    expect(momoJob.name).toEqual('name');
    expect(momoJob.interval).toEqual('one minute');
    expect(momoJob.firstRunAfter).toEqual(0);
    expect(momoJob.concurrency).toEqual(1);
    expect(momoJob.maxRunning).toEqual(1);
    expect(momoJob.handler.toString()).toEqual(jest.fn().toString());
  });

  it('can build a job with all attributes and a cron schedule', () => {
    const momoJob = new MomoJobBuilder()
      .withName('name')
      .withCronSchedule('0 9 * * 1-5')
      .withFirstRunAfter(0)
      .withConcurrency(1)
      .withMaxRunning(1)
      .withHandler(jest.fn())
      .build();

    expect(momoJob.name).toEqual('name');
    expect(momoJob.cronSchedule).toEqual('0 9 * * 1-5');
    expect(momoJob.firstRunAfter).toEqual(0);
    expect(momoJob.concurrency).toEqual(1);
    expect(momoJob.maxRunning).toEqual(1);
    expect(momoJob.handler.toString()).toEqual(jest.fn().toString());
  });

  it('can build a job with required attributes only', () => {
    const momoJobWithInterval = new MomoJobBuilder()
      .withName('name')
      .withInterval('one minute')
      .withHandler(jest.fn())
      .build();

    expect(momoJobWithInterval.name).toEqual('name');
    expect(momoJobWithInterval.interval).toEqual('one minute');
    expect(momoJobWithInterval.firstRunAfter).toBeUndefined();
    expect(momoJobWithInterval.concurrency).toBeUndefined();
    expect(momoJobWithInterval.maxRunning).toBeUndefined();
    expect(momoJobWithInterval.handler.toString()).toEqual(jest.fn().toString());

    const momoJobWithCronSchedule = new MomoJobBuilder()
      .withName('name')
      .withCronSchedule('0 9 * * 1-5')
      .withHandler(jest.fn())
      .build();

    expect(momoJobWithCronSchedule.name).toEqual('name');
    expect(momoJobWithCronSchedule.cronSchedule).toEqual('0 9 * * 1-5');
    expect(momoJobWithCronSchedule.firstRunAfter).toBeUndefined();
    expect(momoJobWithCronSchedule.concurrency).toBeUndefined();
    expect(momoJobWithCronSchedule.maxRunning).toBeUndefined();
    expect(momoJobWithCronSchedule.handler.toString()).toEqual(jest.fn().toString());
  });

  it("cannot build if 'name' not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withInterval('one minute').withHandler(jest.fn());

    expect(() => momoJobBuilder.build()).toThrowError('Error: Job must have a specified name');
  });

  it("cannot build if neither 'interval' nor 'cronSchedule' are specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withName('name').withHandler(jest.fn());

    expect(() => momoJobBuilder.build()).toThrowError(
      'Error: Job must have either a specified interval or a cron schedule'
    );
  });

  it("cannot build if both 'interval' and 'cronSchedule' are specified", () => {
    const momoJobBuilder = new MomoJobBuilder()
      .withName('name')
      .withInterval('one minute')
      .withCronSchedule('0 9 * * 1-5')
      .withHandler(jest.fn());

    expect(() => momoJobBuilder.build()).toThrowError('Error: Job cannot have both an interval and a cron schedule');
  });

  it("cannot build if 'handler' not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withName('name').withInterval('one minute');

    expect(() => momoJobBuilder.build()).toThrowError('Error: Job must have a specified handler');
  });
});
