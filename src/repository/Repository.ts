import { Collection, Filter, MongoClient, ObjectId, OptionalUnlessRequiredId, UpdateFilter, WithId } from 'mongodb';
import { cloneDeep } from 'lodash';

export class Repository<ENTITY extends { _id?: ObjectId }> {
  protected readonly collection: Collection<ENTITY>;

  constructor(mongoClient: MongoClient, collectionName: string, collectionPrefix?: string) {
    const prefixedCollectionName =
      collectionPrefix !== undefined ? `${collectionPrefix}_${collectionName}` : collectionName;
    this.collection = mongoClient.db().collection(prefixedCollectionName);
  }

  async save(entity: OptionalUnlessRequiredId<ENTITY>): Promise<void> {
    // insertOne mutates the entity and adds an _id, so we use cloneDeep
    await this.collection.insertOne(cloneDeep(entity));
  }

  async updateOne(filter: Filter<ENTITY>, update: UpdateFilter<ENTITY>): Promise<void> {
    await this.collection.updateOne(filter, update);
  }

  async find(filter: Filter<ENTITY> = {}): Promise<WithId<ENTITY>[]> {
    const entities = await this.collection.find(filter).toArray();
    return entities.map(this.mapNullToUndefined);
  }

  async findOne(filter: Filter<ENTITY> = {}): Promise<WithId<ENTITY> | undefined> {
    const entity = await this.collection.findOne(filter);
    return entity === null ? undefined : this.mapNullToUndefined(entity);
  }

  async delete(filter: Filter<ENTITY> = {}): Promise<number> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }

  // mongodb returns null instead of undefined for optional fields
  private mapNullToUndefined(entity: WithId<ENTITY>): WithId<ENTITY> {
    const keys = Object.keys(entity);
    // biome-ignore lint/suspicious/noExplicitAny: we have to map all fields on any type
    const entries = keys.map((key) => [key, (entity as any)[key] ?? undefined]);
    return Object.fromEntries(entries) as WithId<ENTITY>;
  }
}
