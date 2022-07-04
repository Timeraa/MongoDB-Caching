import "source-map-support/register";

import Keyv from "keyv";

import type {
	Collection,
	CountDocumentsOptions,
	Filter,
	FindCursor,
	FindOptions,
	WithId
} from "mongodb";

export default class MongoDBCaching<TSchema = any, TContext = any> {
	keyv: Keyv;
	context?: TContext;

	constructor(
		/**
		 * MongoDB collection
		 */
		public collection: Collection<TSchema>,
		keyvOptions?: Keyv.Options<any> & Record<string, unknown>
	) {
		this.keyv = new Keyv(keyvOptions);
	}

	/**
	 * Sets the context for the Cache
	 * @param context Context to set
	 */
	setContext(context: TContext) {
		this.context = context;
	}

	/**
	 * Fetches the first document that matches the filter
	 * @param filter Query for find Operation
	 * @param options Options for find Operation
	 */
	async findOne(
		filter: Filter<TSchema> = {},
		options?: {
			findOptions: FindOptions<Document>;
			ttl?: number;
		}
	): Promise<Awaited<TSchema | null>> {
		const cacheKey = "findOne-" + this.getCacheKey(filter, options);

		return this.throttleFunction(cacheKey, async () => {
			const cacheDoc = await this.keyv.get(cacheKey);

			if (cacheDoc) return cacheDoc;

			const res = await this.collection.findOne(filter, options?.findOptions);

			await this.keyv.set(cacheKey, res, options?.ttl ?? 60);

			return res;
		});
	}

	/**
	 *
	 * @param filter Query for find Operation
	 * @param options Options for find Operation
	 */
	async find(
		filter: Filter<TSchema> = {},
		options?: {
			findOptions?: FindOptions<Document>;
			cursor: (c: FindCursor<WithId<TSchema>>) => Promise<WithId<TSchema>[]>;
			ttl?: number;
		}
	): Promise<WithId<TSchema>[]> {
		const cacheKeyOptions = options
			? { ...options, cursor: options.cursor.toString() }
			: undefined;

		const cacheKey = "find-" + this.getCacheKey(filter, cacheKeyOptions);

		return this.throttleFunction(cacheKey, async () => {
			const cacheDoc = await this.keyv.get(cacheKey);

			if (cacheDoc) return cacheDoc;

			const res =
				(await options?.cursor(
					this.collection.find(filter, options.findOptions)
				)) ||
				(await this.collection.find(filter, options?.findOptions).toArray());

			await this.keyv.set(cacheKey, res, options?.ttl ?? 60);

			return res;
		});
	}

	async countDocuments(
		filter: Filter<TSchema> = {},
		options?: { countOptions?: CountDocumentsOptions; ttl?: number }
	): Promise<number> {
		const cacheKey = "countDocuments-" + this.getCacheKey(filter);

		return this.throttleFunction(cacheKey, async () => {
			const cacheDoc = await this.keyv.get(cacheKey);

			if (cacheDoc) return cacheDoc;

			const res = await this.collection.countDocuments(
				filter,
				options?.countOptions || {}
			);

			await this.keyv.set(cacheKey, res, options?.ttl ?? 60);

			return res;
		});
	}

	async clear() {
		return this.keyv.clear();
	}

	/**
	 * Throttles a function to only be called once per given key until the function is done
	 */
	activeThrottles = new Map<string, Promise<any>>();
	private throttleFunction(name: string, callback: () => Promise<any>) {
		if (this.activeThrottles.has(name)) return this.activeThrottles.get(name);

		const promise = callback();

		this.activeThrottles.set(name, promise);

		promise.finally(() => {
			this.activeThrottles.delete(name);
		});

		return promise;
	}

	getCacheKey(...args: any[]) {
		const elements = args.filter(arg => typeof arg === "object");

		return JSON.stringify(elements.length === 1 ? elements[0] : elements);
	}
}
