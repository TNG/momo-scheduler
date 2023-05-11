import { MongoMemoryServer } from 'mongodb-memory-server';

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
  let schedulesRepository: SchedulesRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await Connection.create({ url: mongo.getUri() }, pingInterval, scheduleId, scheduleName);
    schedulesRepository = connection.getSchedulesRepository();
    await schedulesRepository.createIndex();
  });

  beforeEach(async () => schedulesRepository.delete());

  afterAll(async () => {
    await connection.disconnect();
    await mongo.stop();
  });

  describe('isActiveSchedule', () => {
    it('single schedule is active', async () => {
      const active = await schedulesRepository.isActiveSchedule(scheduleName);

      const entities = await schedulesRepository.find({});

      expect(active).toEqual(true);
      expect(entities).toHaveLength(1);
      expect(entities[0]?.scheduleId).toEqual(scheduleId);
    });

    it('only one schedule is active', async () => {
      const firstIsActive = await schedulesRepository.isActiveSchedule(scheduleName);

      const inactiveScheduleId = 'not active';
      const inactiveConnection = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        inactiveScheduleId,
        scheduleName
      );
      const inactiveSchedulesRepository = inactiveConnection.getSchedulesRepository();
      const secondIsActive = await inactiveSchedulesRepository.isActiveSchedule(scheduleName);
      await inactiveConnection.disconnect();

      const entities = await schedulesRepository.find({});

      expect(firstIsActive).toEqual(true);
      expect(secondIsActive).toEqual(false);
      expect(entities).toHaveLength(1);
      expect(entities[0]?.scheduleId).toEqual(scheduleId);
    });

    it('only one schedule of many concurrent ones is active', async () => {
      const connections = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map(async (id) =>
          Connection.create({ url: mongo.getUri() }, pingInterval, id, scheduleName)
        )
      );

      const schedulesActiveStatus = await Promise.all(
        connections.map(async (connection) => {
          const newSchedulesRepository = connection.getSchedulesRepository();
          return newSchedulesRepository.isActiveSchedule(scheduleName);
        })
      );

      const entities = await schedulesRepository.find({});
      await Promise.all(connections.map(async (connection) => connection.disconnect()));

      expect(schedulesActiveStatus.filter((active) => active)).toHaveLength(1);
      expect(entities).toHaveLength(1);
    });

    it('should replace dead schedules', async () => {
      const active = await schedulesRepository.isActiveSchedule(scheduleName);
      const secondScheduleId = 'not active';
      const secondConnection = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        secondScheduleId,
        scheduleName
      );
      const secondSchedulesRepository = await secondConnection.getSchedulesRepository();
      const secondActive = await secondSchedulesRepository.isActiveSchedule(scheduleName);

      expect(active).toEqual(true);
      expect(secondActive).toEqual(false);

      await sleep(1200);

      const secondTakeOver = await secondSchedulesRepository.isActiveSchedule(scheduleName);
      await secondConnection.disconnect();
      expect(secondTakeOver).toEqual(true);
    });

    it('should allow two active schedules with different names', async () => {
      const isActive = await schedulesRepository.isActiveSchedule(scheduleName);
      const otherScheduleName = 'other schedule';
      const secondScheduleId = 'first other schedule ID';
      const thirdScheduleId = 'second other schedule ID';
      const secondConnection = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        secondScheduleId,
        otherScheduleName
      );
      const secondSchedulesRepository = await secondConnection.getSchedulesRepository();
      const isSecondActive = await secondSchedulesRepository.isActiveSchedule(otherScheduleName);
      const thirdConnection = await Connection.create(
        { url: mongo.getUri() },
        pingInterval,
        thirdScheduleId,
        otherScheduleName
      );
      const thirdSchedulesRepository = await thirdConnection.getSchedulesRepository();
      const isThirdActive = await thirdSchedulesRepository.isActiveSchedule(otherScheduleName);

      expect(isActive).toEqual(true);
      expect(isSecondActive).toEqual(true);
      expect(isThirdActive).toEqual(false);

      await sleep(2 * pingInterval + 100);

      const isFirstStillActive = await schedulesRepository.isActiveSchedule(scheduleName);
      const didThirdTakeOverActive = await thirdSchedulesRepository.isActiveSchedule(otherScheduleName);
      expect(isFirstStillActive).toEqual(true);
      expect(didThirdTakeOverActive).toEqual(true);
      const isSecondStillActive = await secondSchedulesRepository.isActiveSchedule(otherScheduleName);
      expect(isSecondStillActive).toEqual(false);

      await secondConnection.disconnect();
      await thirdConnection.disconnect();
    });
  });

  describe('with schedule', () => {
    beforeEach(async () => {
      await schedulesRepository.isActiveSchedule(scheduleName);
    });

    describe('removeJob', () => {
      it('can remove a job', async () => {
        await schedulesRepository.addExecution(name, 0);

        const schedulesEntity = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity?.executions).toEqual({ [name]: 1 });

        await schedulesRepository.removeJob(scheduleId, name);
        const schedulesEntity2 = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity2?.executions).toEqual({});
      });

      it('keeps other job', async () => {
        const otherName = 'other job';
        await schedulesRepository.addExecution(name, 0);
        await schedulesRepository.addExecution(otherName, 0);

        const schedulesEntity = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity?.executions).toEqual({ [name]: 1, [otherName]: 1 });

        await schedulesRepository.removeJob(scheduleId, name);
        const schedulesEntity2 = await schedulesRepository.findOne({ scheduleId });
        expect(schedulesEntity2?.executions).toEqual({ [otherName]: 1 });
      });
    });

    describe('execution', () => {
      it('can add and remove an execution', async () => {
        const { added, running } = await schedulesRepository.addExecution(name, 1);
        expect(added).toBe(true);
        expect(running).toBe(0);

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
          scheduleName
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
