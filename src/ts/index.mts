import {createRequire} from "node:module";
import {getBindingsPath, prepareBindings} from "./utils.js";
import {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable} from "./types.js";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(join(__dirname, "..", ".."));
const bindingsPath = getBindingsPath(rootDir);
const customRequire = createRequire(__dirname);
const bindings = customRequire(bindingsPath);
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
