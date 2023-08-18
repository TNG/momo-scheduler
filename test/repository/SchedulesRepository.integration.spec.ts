import { MongoMemoryServer } from 'mongodb-memory-server';
import { DateTime } from 'luxon';

import { Connection } from '../../src/Connection';
import { ScheduleState, SchedulesRepository } from '../../src/repository/SchedulesRepository';
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
      await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());

      const schedule = await schedulesRepository.findOne({ name: scheduleName, scheduleId });
      expect(schedule).not.toBeNull();
    });

    it('refuses to set another active schedule', async () => {
      await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());

      const anotherScheduleId = 'not active';
      const anotherInstance = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        anotherScheduleId,
        scheduleName,
      );
      const anotherSchedulesRepository = anotherInstance.getSchedulesRepository();
      const error = jest.fn();
      anotherSchedulesRepository.setLogger({ debug: jest.fn(), error });

      const active = await anotherSchedulesRepository.setActiveSchedule(DateTime.now().toMillis());
      await anotherInstance.disconnect();

      expect(error).toHaveBeenCalled();
      expect(active).toEqual(false);

      const schedules = await schedulesRepository.find({ name: scheduleName });
      expect(schedules).toHaveLength(1);
      expect(schedules[0]?.scheduleId).toEqual(scheduleId);
    });

    it('only one schedule of many concurrent ones is active', async () => {
      const connections = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map(async (id) =>
          Connection.create({ url: mongo.getUri() }, pingInterval, id, scheduleName),
        ),
      );

      const active = await Promise.all(
        connections.map(async (connection) =>
          connection.getSchedulesRepository().setActiveSchedule(DateTime.now().toMillis()),
        ),
      );

      await Promise.all(connections.map(async (connection) => connection.disconnect()));

      expect(active.filter((active) => active)).toHaveLength(1);
      const schedules = await schedulesRepository.find({ name: scheduleName });
      expect(schedules).toHaveLength(1);
    });

    it('should replace dead schedules', async () => {
      await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());
      const otherScheduleId = 'not active';

      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, otherScheduleId, scheduleName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();
      await sleep(2 * pingInterval);

      const active = await secondSchedulesRepository.setActiveSchedule(DateTime.now().toMillis());

      expect(active).toEqual(true);
    });

    it('sets two active schedules with different names', async () => {
      const otherName = 'other schedule';
      const otherScheduleId = 'other schedule ID';

      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, otherScheduleId, otherName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      const active = await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());
      const secondActive = await secondSchedulesRepository.setActiveSchedule(DateTime.now().toMillis());

      expect(active).toEqual(true);
      expect(secondActive).toEqual(true);
    });
  });

  describe('getScheduleState', () => {
    it('detects active schedule', async () => {
      await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());

      const active = await schedulesRepository.getScheduleState(DateTime.now().toMillis());

      expect(active).toBe(ScheduleState.thisInstanceActive);
    });

    it('detects active schedule after ping interval elapsed', async () => {
      await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());
      await sleep(2 * pingInterval);

      const active = await schedulesRepository.getScheduleState(DateTime.now().toMillis());

      expect(active).toBe(ScheduleState.thisInstanceActive);
    });

    it('detects other active schedule with identical name', async () => {
      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, 'other schedule', scheduleName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      const now = DateTime.now().toMillis();
      await schedulesRepository.setActiveSchedule(now);

      const active = await secondSchedulesRepository.getScheduleState(now);

      expect(active).toBe(ScheduleState.differentInstanceActive);
    });

    it('does not consider dead schedule with identical name', async () => {
      secondConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, 'other schedule', scheduleName);
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      await schedulesRepository.setActiveSchedule(DateTime.now().toMillis());
      await sleep(2 * pingInterval);

      const active = await secondSchedulesRepository.getScheduleState(DateTime.now().toMillis());

      expect(active).toBe(ScheduleState.inactive);
    });

    it('does not consider schedule with different name', async () => {
      secondConnection = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        'other schedule',
        'other schedule',
      );
      const secondSchedulesRepository = secondConnection.getSchedulesRepository();

      const now = DateTime.now().toMillis();
      await schedulesRepository.setActiveSchedule(now);

      const active = await secondSchedulesRepository.getScheduleState(now);

      expect(active).toBe(ScheduleState.inactive);
    });
  });

  describe('with active schedule', () => {
    beforeEach(async () => schedulesRepository.setActiveSchedule(DateTime.now().toMillis()));

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

    describe('ping', () => {
      it('updates timestamp', async () => {
        const schedulesEntity = await schedulesRepository.findOne({ scheduleId });

        await schedulesRepository.ping();

        const schedulesEntityAfterPing = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntityAfterPing?.lastAlive).toBeGreaterThan(schedulesEntity!.lastAlive);
      });
    });
  });
});
