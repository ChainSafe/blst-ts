import {resolve} from "node:path";
import {getBindingsPath} from "../utils";
import {prepareBindings} from "./bindings";
export type {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable} from "./bindings";

const rootDir = __dirname.includes("dist/cjs") ? resolve(__dirname, "..", "..", "..") : resolve(__dirname, "..");
const bindingsPath = getBindingsPath(rootDir);
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const blstTs = prepareBindings(require(bindingsPath));

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
