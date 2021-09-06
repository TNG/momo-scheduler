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
    return this.collection.find(filter).toArray();
  }

  async findOne(filter: Filter<ENTITY> = {}): Promise<ENTITY | undefined> {
    return this.collection.findOne(filter);
  }

  async delete(filter: Filter<ENTITY> = {}): Promise<number> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }

  async deleteOne(filter: Filter<ENTITY>): Promise<void> {
    await this.collection.deleteOne(filter);
  }
}
