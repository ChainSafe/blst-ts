import {BINDINGS_NAME, getBindingsPath} from "./utils";
import {prepareBindings} from "./bindings";
export type {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable} from "./bindings";

const bindings = await import(getBindingsPath(BINDINGS_NAME));
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
