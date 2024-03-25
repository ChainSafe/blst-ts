import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {getBindingsPath} from "../utils/index.js";
import {prepareBindings} from "./bindings.js";
export type {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable} from "./bindings.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = __dirname.includes("dist/esm") ? resolve(__dirname, "..", "..", "..") : resolve(__dirname, "..");
const bindingsPath = getBindingsPath(rootDir);
const require = createRequire(import.meta.url);
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
