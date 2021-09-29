import { Collection, Filter, MongoClient, ObjectId, OptionalId, UpdateFilter } from 'mongodb';
import { cloneDeep } from 'lodash';

export class Repository<ENTITY extends { _id?: ObjectId }> {
  private readonly collection: Collection<ENTITY>;

  constructor(mongoClient: MongoClient, collectionName: string) {
    this.collection = mongoClient.db().collection(collectionName);
  }

  async save(entity: OptionalId<ENTITY>): Promise<void> {
    // insertOne mutates the entity and adds an _id, so we use cloneDeep
    await this.collection.insertOne(cloneDeep(entity));
  }

  async updateOne(filter: Filter<ENTITY>, update: UpdateFilter<ENTITY>): Promise<void> {
    await this.collection.updateOne(filter, update);
  }

  async find(filter: Filter<ENTITY> = {}): Promise<ENTITY[]> {
    const entities = await this.collection.find(filter).toArray();
    return entities.map(this.mapNullToUndefined);
  }

  async findOne(filter: Filter<ENTITY> = {}): Promise<ENTITY | undefined> {
    const entity = await this.collection.findOne(filter);
    return entity === undefined ? undefined : this.mapNullToUndefined(entity);
  }

  async delete(filter: Filter<ENTITY> = {}): Promise<number> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }

  async deleteOne(filter: Filter<ENTITY>): Promise<void> {
    await this.collection.deleteOne(filter);
  }

  // mongodb returns null instead of undefined for optional fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapNullToUndefined(entity: any): ENTITY {
    const keys = Object.keys(entity);
    const entries = keys.map((key) => [key, entity[key] ?? undefined]);
    return Object.fromEntries(entries) as ENTITY;
  }
}
