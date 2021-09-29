import { MomoJobBuilder } from '../../src/job/MomoJobBuilder';

describe('MomoJobBuilder', () => {
  it('can build a job with all attributes', () => {
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

  it('can build only with required attributes', () => {
    const momoJob = new MomoJobBuilder().withName('name').withInterval('one minute').withHandler(jest.fn()).build();

    expect(momoJob.name).toEqual('name');
    expect(momoJob.interval).toEqual('one minute');
    expect(momoJob.firstRunAfter).toBeUndefined();
    expect(momoJob.concurrency).toBeUndefined();
    expect(momoJob.maxRunning).toBeUndefined();
    expect(momoJob.handler.toString()).toEqual(jest.fn().toString());
  });

  it("cannot build if 'name' not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withInterval('one minute').withHandler(jest.fn());

    expect(() => momoJobBuilder.build()).toThrowError('Error: Job must have a specified name');
  });

  it("cannot build if 'interval' not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withName('name').withHandler(jest.fn());

    expect(() => momoJobBuilder.build()).toThrowError('Error: Job must have a specified interval');
  });

  it("cannot build if 'handler' not specified", () => {
    const momoJobBuilder = new MomoJobBuilder().withName('name').withInterval('one minute');

    expect(() => momoJobBuilder.build()).toThrowError('Error: Job must have a specified handler');
  });
});
