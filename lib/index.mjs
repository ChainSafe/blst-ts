import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {getBindingsPath} from "../utils/index.js";
import {prepareBindings} from "./bindings.js";

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rootDir = __dirname.includes("dist/esm") ? resolve(__dirname, "..", "..", "..") : resolve(__dirname, "..");
const bindingsPath = getBindingsPath(rootDir);
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
