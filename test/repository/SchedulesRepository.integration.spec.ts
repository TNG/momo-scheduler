import { MongoMemoryServer } from 'mongodb-memory-server';

import { Connection } from '../../src/Connection';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository';

describe('SchedulesRepository', () => {
  const scheduleId = '123';
  const pingInterval = 500;
  const name = 'test job';

  let mongo: MongoMemoryServer;
  let connection: Connection;
  let schedulesRepository: SchedulesRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await Connection.create({ url: mongo.getUri() }, pingInterval, scheduleId);
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
      const active = await schedulesRepository.isActiveSchedule();

      const entities = await schedulesRepository.find({});

      expect(active).toEqual(true);
      expect(entities).toHaveLength(1);
      expect(entities[0]?.scheduleId).toEqual(scheduleId);
    });

    it('only one schedule is active', async () => {
      const active = await schedulesRepository.isActiveSchedule();

      const notActiveScheduleId = 'not active';
      const notActiveConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, notActiveScheduleId);
      const notActiveSchedulesRepository = notActiveConnection.getSchedulesRepository();
      const notActive = await notActiveSchedulesRepository.isActiveSchedule();
      await notActiveConnection.disconnect();

      const entities = await schedulesRepository.find({});

      expect(active).toEqual(true);
      expect(notActive).toEqual(false);
      expect(entities).toHaveLength(1);
      expect(entities[0]?.scheduleId).toEqual(scheduleId);
    });

    it('only one schedule of many concurrent ones is active', async () => {
      const connections = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map(async (id) => Connection.create({ url: mongo.getUri() }, pingInterval, id))
      );

      const schedules = await Promise.all(
        connections.map(async (connection) => {
          const newSchedulesRepository = connection.getSchedulesRepository();
          return newSchedulesRepository.isActiveSchedule();
        })
      );

      const entities = await schedulesRepository.find({});
      await Promise.all(connections.map(async (connection) => connection.disconnect()));

      expect(schedules.filter((active) => active)).toHaveLength(1);
      expect(entities).toHaveLength(1);
    });
  });

  describe('with schedule', () => {
    beforeEach(async () => {
      await schedulesRepository.isActiveSchedule();
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
        const otherConnection = await Connection.create({ url: mongo.getUri() }, pingInterval, otherScheduleId);
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
