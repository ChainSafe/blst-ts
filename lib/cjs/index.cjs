"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMultipleAggregateSignatures = exports.verify = exports.randomBytesNonZero = exports.fastAggregateVerify = exports.asyncVerifyMultipleAggregateSignatures = exports.asyncVerify = exports.asyncFastAggregateVerify = exports.asyncAggregateVerify = exports.aggregateVerify = exports.aggregateSignatures = exports.aggregatePublicKeys = exports.Signature = exports.SecretKey = exports.PublicKey = exports.CoordType = exports.BLST_CONSTANTS = void 0;
const utils_js_1 = require("./utils.js");
const node_path_1 = require("node:path");
const rootDir = (0, node_path_1.resolve)((0, node_path_1.join)(__dirname, "..", ".."));
const bindingsPath = (0, utils_js_1.getBindingsPath)(rootDir);
// This is CJS file
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const bindings = require(bindingsPath);
const blstTs = (0, utils_js_1.prepareBindings)(bindings);
exports.default = blstTs;
const { BLST_CONSTANTS, CoordType, PublicKey, SecretKey, Signature, aggregatePublicKeys, aggregateSignatures, aggregateVerify, asyncAggregateVerify, asyncFastAggregateVerify, asyncVerify, asyncVerifyMultipleAggregateSignatures, fastAggregateVerify, randomBytesNonZero, verify, verifyMultipleAggregateSignatures, } = blstTs;
exports.BLST_CONSTANTS = BLST_CONSTANTS;
exports.CoordType = CoordType;
exports.PublicKey = PublicKey;
exports.SecretKey = SecretKey;
exports.Signature = Signature;
exports.aggregatePublicKeys = aggregatePublicKeys;
exports.aggregateSignatures = aggregateSignatures;
exports.aggregateVerify = aggregateVerify;
exports.asyncAggregateVerify = asyncAggregateVerify;
exports.asyncFastAggregateVerify = asyncFastAggregateVerify;
exports.asyncVerify = asyncVerify;
exports.asyncVerifyMultipleAggregateSignatures = asyncVerifyMultipleAggregateSignatures;
exports.fastAggregateVerify = fastAggregateVerify;
exports.randomBytesNonZero = randomBytesNonZero;
exports.verify = verify;
exports.verifyMultipleAggregateSignatures = verifyMultipleAggregateSignatures;
//# sourceMappingURL=index.cjs.map