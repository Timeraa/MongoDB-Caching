const tsPreset = require("ts-jest/jest-preset");
const mongodbPreset = require("@shelf/jest-mongodb/jest-preset");

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
	...tsPreset,
	...mongodbPreset,
	rootDir: "__tests__",
	testMatch: ["**/*.test.ts"],
	maxWorkers: 1
};
