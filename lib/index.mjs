import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {getBindingsPath} from "../utils/index.js";
import {prepareBindings} from "./bindings.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
/**
 * ESM is only used in the production bundle so a ternary is not necessary here
 * like in the CJS version.  If CJS is ever removed that logic will need to be
 * moved over to here.
 */
const rootDir = resolve(__dirname, "..", "..", "..");
const bindingsPath = getBindingsPath(rootDir);
const blstTs = prepareBindings(await import(bindingsPath));

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
