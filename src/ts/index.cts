import {getBindingsPath, prepareBindings} from "./utils.js";
import {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable} from "./types.js";
import {join, resolve} from "node:path";

const rootDir = resolve(join(__dirname, "..", ".."));
const bindingsPath = getBindingsPath(rootDir);
// This is CJS file
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const bindings = require(bindingsPath);
const blstTs = prepareBindings(bindings);

export default blstTs;

const {
  BLST_CONSTANTS,
  CoordType,
  PublicKey,
  SecretKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateVerify,
  asyncAggregateVerify,
  asyncFastAggregateVerify,
  asyncVerify,
  asyncVerifyMultipleAggregateSignatures,
  fastAggregateVerify,
  randomBytesNonZero,
  verify,
  verifyMultipleAggregateSignatures,
} = blstTs;

export type {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable};

export {
  BLST_CONSTANTS,
  CoordType,
  PublicKey,
  SecretKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateVerify,
  asyncAggregateVerify,
  asyncFastAggregateVerify,
  asyncVerify,
  asyncVerifyMultipleAggregateSignatures,
  fastAggregateVerify,
  randomBytesNonZero,
  verify,
  verifyMultipleAggregateSignatures,
};
