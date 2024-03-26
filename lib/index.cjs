/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const {resolve} = require("path");
const {getBindingsPath} = require("../utils");
const {prepareBindings} = require("./bindings");

const rootDir = __dirname.includes("dist/cjs") ? resolve(__dirname, "..", "..", "..") : resolve(__dirname, "..");
const bindingsPath = getBindingsPath(rootDir);
const blstTs = prepareBindings(require(bindingsPath));

exports.default = blstTs;
exports.BLST_CONSTANTS = blstTs.BLST_CONSTANTS;
exports.CoordType = blstTs.CoordType;
exports.PublicKey = blstTs.PublicKey;
exports.SecretKey = blstTs.SecretKey;
exports.Signature = blstTs.Signature;
exports.aggregatePublicKeys = blstTs.aggregatePublicKeys;
exports.aggregateSignatures = blstTs.aggregateSignatures;
exports.aggregateVerify = blstTs.aggregateVerify;
exports.asyncAggregateVerify = blstTs.asyncAggregateVerify;
exports.asyncFastAggregateVerify = blstTs.asyncFastAggregateVerify;
exports.asyncVerify = blstTs.asyncVerify;
exports.asyncVerifyMultipleAggregateSignatures = blstTs.asyncVerifyMultipleAggregateSignatures;
exports.fastAggregateVerify = blstTs.fastAggregateVerify;
exports.randomBytesNonZero = blstTs.randomBytesNonZero;
exports.verify = blstTs.verify;
exports.verifyMultipleAggregateSignatures = blstTs.verifyMultipleAggregateSignatures;
