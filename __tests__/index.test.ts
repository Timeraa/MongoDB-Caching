import { MongoClient } from "mongodb";

import MongoDBCaching from "../src";

let connection: MongoClient;
beforeAll(async () => {
	//@ts-ignore
	connection = await MongoClient.connect(globalThis.__MONGO_URI__);
});

afterAll(async () => {
	await connection.close();
});

class TestClass extends MongoDBCaching {}

const doc = { test: true },
	doc1 = { test: false };

describe("MongoDB-Caching", () => {
	let cacheClass: TestClass;

	beforeEach(async () => await cacheClass.keyv.clear());

	beforeAll(async () => {
		cacheClass = new TestClass(connection.db("test").collection("test"));

		await cacheClass.collection.insertMany([doc, doc1]);
	});

	it("should have no context", () => {
		expect(cacheClass.context).toBeUndefined();
	});

	it("should set the context", () => {
		const context = { test: true };

		cacheClass.setContext(context);

		expect(cacheClass.context).toEqual(context);
	});

	it("should find a document", async () => {
		const dbFindOneSpy = jest.spyOn(cacheClass.collection, "findOne");

		const res = await cacheClass.findOne(doc);

		expect(dbFindOneSpy).toHaveBeenCalledTimes(1);
		expect(res).toMatchObject(doc);

		dbFindOneSpy.mockRestore();
	});

	it("should return a cached object", async () => {
		const dbFindOneSpy = jest.spyOn(cacheClass.collection, "findOne");

		await cacheClass.findOne(doc);
		const res = await cacheClass.findOne(doc);

		expect(dbFindOneSpy).toHaveBeenCalledTimes(1);

		expect(res).toMatchObject(doc);
		expect(await cacheClass.keyv.has(cacheClass.getCacheKey(doc))).toBe(true);

		dbFindOneSpy.mockRestore();
	});

	it("should return the count of documents", async () => {
		const dbCountDocumentsSpy = jest.spyOn(
			cacheClass.collection,
			"countDocuments"
		);

		const res = await cacheClass.countDocuments();

		expect(dbCountDocumentsSpy).toHaveBeenCalledTimes(1);

		expect(res).toBe(2);

		dbCountDocumentsSpy.mockRestore();
	});

	it("should return the cached count of documents", async () => {
		const dbCountDocumentsSpy = jest.spyOn(
			cacheClass.collection,
			"countDocuments"
		);

		await cacheClass.countDocuments();
		const res = await cacheClass.countDocuments();

		expect(dbCountDocumentsSpy).toHaveBeenCalledTimes(1);

		expect(res).toBe(2);

		dbCountDocumentsSpy.mockRestore();
	});

	it("should clear the cache", async () => {
		await cacheClass.findOne(doc);
		await cacheClass.clear();

		expect(await cacheClass.keyv.has(cacheClass.getCacheKey(doc))).toBe(false);
	});

	it("should return multiple documents", async () => {
		const dbFindSpy = jest.spyOn(cacheClass.collection, "find");

		const res = await cacheClass.find();

		expect(dbFindSpy).toHaveBeenCalledTimes(1);
		expect(res).toMatchObject([doc, doc1]);

		dbFindSpy.mockRestore();
	});

	it("should use the cursor on Find", async () => {
		const dbFindSpy = jest.spyOn(cacheClass.collection, "find");

		const res = await cacheClass.find(
			{},
			{ cursor: c => c.limit(1).toArray() }
		);

		expect(dbFindSpy).toHaveBeenCalledTimes(1);
		expect(res).toHaveLength(1);
		expect(res).toMatchObject([doc]);

		const res1 = await cacheClass.find(
			{},
			{ cursor: c => c.skip(1).toArray() }
		);

		expect(res1).toHaveLength(1);
		expect(res1).toMatchObject([doc1]);
		expect(dbFindSpy).toHaveBeenCalledTimes(2);

		dbFindSpy.mockRestore();
	});

	it("should return the cached documents", async () => {
		const dbFindSpy = jest.spyOn(cacheClass.collection, "find");

		await cacheClass.find();
		const res = await cacheClass.find();

		expect(dbFindSpy).toHaveBeenCalledTimes(1);

		expect(res).toMatchObject([doc, doc1]);

		dbFindSpy.mockRestore();
	});

	it("should find a document without spamming the database", async () => {
		const activeThrottlesSpy = jest.spyOn(cacheClass.activeThrottles, "get");

		const promise1 = cacheClass.findOne(doc),
			promise2 = cacheClass.findOne(doc);

		expect(activeThrottlesSpy).toHaveBeenCalledTimes(1);

		await Promise.all([promise1, promise2]);

		expect(promise1).toStrictEqual(promise2);

		activeThrottlesSpy.mockClear();
	});

	it("should find multiple documents without spamming the database", async () => {
		const activeThrottlesSpy = jest.spyOn(cacheClass.activeThrottles, "get");

		const promise1 = cacheClass.find(),
			promise2 = cacheClass.find();

		expect(activeThrottlesSpy).toHaveBeenCalledTimes(1);

		await Promise.all([promise1, promise2]);

		expect(promise1).toStrictEqual(promise2);

		activeThrottlesSpy.mockClear();
	});

	it("should count all documents without spamming the database", async () => {
		const activeThrottlesSpy = jest.spyOn(cacheClass.activeThrottles, "get");

		const promise1 = cacheClass.countDocuments(),
			promise2 = cacheClass.countDocuments();

		expect(activeThrottlesSpy).toHaveBeenCalledTimes(1);

		await Promise.all([promise1, promise2]);

		expect(promise1).toStrictEqual(promise2);

		activeThrottlesSpy.mockClear();
	});
});
