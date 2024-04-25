/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {resolve, dirname} from "node:path";
import {prepareBindings} from "./bindings.js";
import {getBindingsPath} from "../utils/index.js";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const bindingsPath = getBindingsPath(resolve(__dirname, "..", "..", ".."));
const blstTs = prepareBindings(require(bindingsPath));

export default blstTs;

const {
  BLST_CONSTANTS,
  CoordType,
  SecretKey,
  PublicKey,
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
  SecretKey,
  PublicKey,
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
