# MongoDB-Caching [![Version](https://img.shields.io/npm/v/mongodb-caching.svg)](https://www.npmjs.com/package/mongodb-caching)

MongoDB with automatic Caching functionality using Keyv.

## Instalation

```bash
# npm
npm install mongodb-caching

# yarn
yarn add mongodb-caching

#pnpm
pnpm i mongodb-caching
```

## Cached functions

_These functions automatically handle caching_

- find
- findOne
- countDocuments

**NOTE: When you update/insert/delete a document, the cache is not updated, you'll need to manually clear the cache using `customClass.clear()` or `customClass.keyv.clear()`**

## Usage

### Main

```ts
import { MongoClient } from "mongodb";

import MongoDBCaching from "mongodb-caching";

interface UserCollectionSchema {
	username: string;
}

class User extends MongoDBCaching<UserCollectionSchema> {
	create(username: string) {
		//* this.collection refers to MongoDB.Db.Collection
		return this.collection.insertOne({ username });
	}

	getUser(username: string) {
		//* Internally handles caching
		return this.findOne({ username });
	}
}

async function run() {
	const mongodb = new MongoClient("mongoUri");

	const userCollection = new User(mongodb.db("main").collection("users"));

	await userCollection.create("Timeraa");

	console.log(await userCollection.getUser("Timeraa"));
}

run();
```

### With context

```ts
import { MongoClient } from "mongodb";

import MongoDBCaching from "mongodb-caching";

interface UserCollectionSchema {
	username: string;
	ip: string;
}

interface Context {
	ip: string;
}

class User extends MongoDBCaching<UserCollectionSchema, Context> {
	create(username: string) {
		//* this.collection refers to MongoDB.Db.Collection
		return this.collection.insertOne({
			username,
			ip: this.context!.ip
		});
	}

	getUser(username: string) {
		//* Internally handles caching
		return this.findOne({ username });
	}
}

async function run() {
	const mongodb = new MongoClient("mongoUri");

	const userCollection = new User(mongodb.db("main").collection("users"));

	//* Context would be set in let's say a middleware
	userCollection.setContext({ ip: "someIp" });

	await userCollection.create("Timeraa");

	console.log((await userCollection.getUser("Timeraa"))?.ip);
}

run();
```
