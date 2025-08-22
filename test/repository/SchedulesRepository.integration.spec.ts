import { MongoMemoryServer } from 'mongodb-memory-server';
import { DateTime } from 'luxon';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Connection } from '../../src/Connection';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { sleep } from '../utils/sleep';

describe('SchedulesRepository', () => {
  const scheduleName = 'schedule';
  const scheduleId = '123';
  const pingInterval = 500;
  const name = 'test job';

  let mongo: MongoMemoryServer;
  let connection: Connection;
  let secondConnection: Connection | undefined;
  let schedulesRepository: SchedulesRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await Connection.create({ url: mongo.getUri() }, pingInterval, scheduleId, scheduleName);
    schedulesRepository = connection.getSchedulesRepository();
    await schedulesRepository.createIndex();
  });

  beforeEach(async () => schedulesRepository.delete());
  afterEach(async () => secondConnection?.disconnect());

  afterAll(async () => {
    await connection.disconnect();
    await mongo.stop();
  });

  describe('setActiveSchedule', () => {
    it('sets single schedule as active', async () => {
      await schedulesRepository.setActiveSchedule();

      const schedule = await schedulesRepository.findOne({ name: scheduleName, scheduleId });
      expect(schedule).not.toBeNull();
    });

    it('updates timestamp', async () => {
      await schedulesRepository.setActiveSchedule();
      const scheduleEntity = await schedulesRepository.findOne({ scheduleId });

      await sleep(pingInterval);
      await schedulesRepository.setActiveSchedule();

      const scheduleEntityAfterPing = await schedulesRepository.findOne({ scheduleId });
      expect(scheduleEntityAfterPing?.lastAlive).toBeGreaterThan(scheduleEntity!.lastAlive);
    });

    it('refuses to set another active schedule', async () => {
      await schedulesRepository.setActiveSchedule();
      const lastAlive = DateTime.now().toMillis();

      const anotherScheduleId = 'not active';
      const anotherInstance = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        anotherScheduleId,
        scheduleName,
      );
      const anotherSchedulesRepository = anotherInstance.getSchedulesRepository();
      const debug = vi.fn();
      anotherSchedulesRepository.setLogger({ debug, error: vi.fn() });

      const active = await anotherSchedulesRepository.setActiveSchedule();
      await anotherInstance.disconnect();

      expect(debug).toHaveBeenCalled();
      expect(active).toEqual(false);

      const schedules = await schedulesRepository.find({ name: scheduleName });
      expect(schedules).toHaveLength(1);
      expect(schedules[0]?.scheduleId).toEqual(scheduleId);
      expect(schedules[0]?.lastAlive).toBeLessThanOrEqual(lastAlive);
    });

    it('sets only one schedule of many concurrent ones as active', async () => {
      const connections = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map(async (id) =>
          Connection.create({ url: mongo.getUri() }, pingInterval, id, scheduleName),
        ),
      );

      const active = await Promise.all(
        connections.map(async (connection) => connection.getSchedulesRepository().setActiveSchedule()),
      );

      await Promise.all(connections.map(async (connection) => connection.disconnect()));

      expect(active.filter((active) => active)).toHaveLength(1);
      const schedules = await schedulesRepository.find({ name: scheduleName });
      expect(schedules).toHaveLength(1);
    });

    it('replaces a dead schedule', async () => {
      await schedulesRepository.setActiveSchedule();
      const otherScheduleId = 'other schedule ID';

      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, otherScheduleId, scheduleName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      await sleep(2 * pingInterval + 10);
      const active = await secondSchedulesRepository.setActiveSchedule();

      expect(active).toEqual(true);
    });

    it('sets two active schedules with different names', async () => {
      const otherName = 'other schedule';
      const otherScheduleId = 'other schedule ID';

      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, otherScheduleId, otherName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      const active = await schedulesRepository.setActiveSchedule();
      const secondActive = await secondSchedulesRepository.setActiveSchedule();

      expect(active).toEqual(true);
      expect(secondActive).toEqual(true);
    });

    it('keeps executions if schedule stays alive', async () => {
      await schedulesRepository.setActiveSchedule();
      await schedulesRepository.addExecution(name, 0);

      await sleep(pingInterval);
      await schedulesRepository.setActiveSchedule();

      const scheduleEntityAfterPing = await schedulesRepository.findOne({ name: scheduleName });
      expect(scheduleEntityAfterPing?.executions).toEqual({ [name]: 1 });
    });

    it('removes executions if schedule replaces a dead schedule', async () => {
      await schedulesRepository.setActiveSchedule();
      await schedulesRepository.addExecution(name, 0);

      await sleep(2 * pingInterval + 10);
      await schedulesRepository.setActiveSchedule();

      const scheduleEntityAfterPing = await schedulesRepository.findOne({ name: scheduleName });
      expect(scheduleEntityAfterPing?.executions).toEqual({});
    });

    it('removes executions if schedule replaces a dead schedule with different id', async () => {
      await schedulesRepository.setActiveSchedule();
      await schedulesRepository.addExecution(name, 0);
      const otherScheduleId = 'other schedule ID';

      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, otherScheduleId, scheduleName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      await sleep(2 * pingInterval + 10);
      await secondSchedulesRepository.setActiveSchedule();

      const scheduleEntityAfterPing = await schedulesRepository.findOne({ name: scheduleName });
      expect(scheduleEntityAfterPing?.executions).toEqual({});
    });
  });

  describe('with active schedule', () => {
    beforeEach(async () => schedulesRepository.setActiveSchedule());

    describe('removeJob', () => {
      it('can remove a job', async () => {
        await schedulesRepository.addExecution(name, 0);

        const schedulesEntity = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity?.executions).toEqual({ [name]: 1 });

        await schedulesRepository.removeJob(name);
        const schedulesEntity2 = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity2?.executions).toEqual({});
      });

      it('keeps other job', async () => {
        const otherName = 'other job';
        await schedulesRepository.addExecution(name, 0);
        await schedulesRepository.addExecution(otherName, 0);

        const schedulesEntity = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity?.executions).toEqual({ [name]: 1, [otherName]: 1 });

        await schedulesRepository.removeJob(name);
        const schedulesEntity2 = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity2?.executions).toEqual({ [otherName]: 1 });
      });
    });

    describe('execution', () => {
      it('can add and remove an execution', async () => {
        const { added, running } = await schedulesRepository.addExecution(name, 1);
        expect(added).toBe(true);
        expect(running).toBe(1);

        const schedulesEntity = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity?.executions).toEqual({ [name]: 1 });

        await schedulesRepository.removeExecution(name);

        const schedulesEntity2 = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity2?.executions).toEqual({ [name]: 0 });
      });

      it('cannot add an execution when maxRunning is reached', async () => {
        await schedulesRepository.addExecution(name, 1);
        const { added, running } = await schedulesRepository.addExecution(name, 1);
        expect(added).toBe(false);
        expect(running).toBe(1);
      });

      it('can add an execution with maxRunning set to 0', async () => {
        const executionPing = await schedulesRepository.addExecution(name, 0);
        expect(executionPing).toBeDefined();
      });

      it('does not add executions in schedule that is not active', async () => {
        const otherScheduleId = 'other schedule';
        const otherConnection = await Connection.create(
          { url: mongo.getUri() },
          pingInterval,
          otherScheduleId,
          scheduleName,
        );
        const otherSchedulesRepository = otherConnection.getSchedulesRepository();

        await otherSchedulesRepository.addExecution(name, 2);

        const running = await otherSchedulesRepository.countRunningExecutions(name);
        await otherConnection.disconnect();
        expect(running).toBe(0);
      });
    });

    describe('countRunningExecutions', () => {
      it('returns number of executions', async () => {
        await schedulesRepository.addExecution(name, 2);
        await schedulesRepository.addExecution(name, 2);

        const running = await schedulesRepository.countRunningExecutions(name);
        expect(running).toBe(2);
      });
    });
  });
});
