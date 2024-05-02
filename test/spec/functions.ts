import {
  CoordType,
  SecretKey,
  PublicKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  verify as VERIFY,
  aggregateVerify,
  fastAggregateVerify,
  SignatureSet,
  verifyMultipleAggregateSignatures,
} from "../../lib";
import {fromHex, toHex} from "../utils";

export const testFnByName: Record<string, (data: any) => any> = {
  sign,
  eth_aggregate_pubkeys: aggregate_public_keys,
  aggregate: aggregate_signatures,
  verify,
  aggregate_verify,
  fast_aggregate_verify,
  eth_fast_aggregate_verify: fast_aggregate_verify,
  batch_verify,
  deserialization_G1,
  deserialization_G2,
};

/**
 * input:
 *   privkey: bytes32 -- the private key used for signing
 *   message: bytes32 -- input message to sign (a hash)
 * output: BLS Signature -- expected output, single BLS signature or empty.
 */
function sign(input: {privkey: string; message: string}): string {
  const {privkey, message} = input;
  const sk = SecretKey.deserialize(fromHex(privkey));
  const signature = sk.sign(fromHex(message));
  return toHex(signature.serialize());
}

/**
 * ```
 * input: pubkey: bytes48 -- the pubkey
 * output: bool  -- VALID or INVALID
 * ```
 * https://github.com/ethereum/bls12-381-tests/blob/master/formats/deserialization_G1.md
 */
function deserialization_G1(input: {pubkey: string}): boolean {
  try {
    const pk = PublicKey.deserialize(fromHex(input.pubkey), CoordType.jacobian);
    pk.keyValidate();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * ```
 * input: signature: bytes92 -- the signature
 * output: bool  -- VALID or INVALID
 * ```
 * https://github.com/ethereum/bls12-381-tests/blob/master/formats/deserialization_G2.md
 */
function deserialization_G2(input: {signature: string}): boolean {
  try {
    const sig = Signature.deserialize(fromHex(input.signature), undefined);
    sig.sigValidate();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * ```
 * input: List[BLS Signature] -- list of input BLS signatures
 * output: BLS Signature -- expected output, single BLS signature or empty.
 * ```
 */
function aggregate_public_keys(input: string[]): string {
  const agg = aggregatePublicKeys(input.map(fromHex));
  return toHex(agg.serialize());
}

/**
 * ```
 * input: List[BLS Signature] -- list of input BLS signatures
 * output: BLS Signature -- expected output, single BLS signature or empty.
 * ```
 */
function aggregate_signatures(input: string[]): string {
  const agg = aggregateSignatures(input.map(fromHex));
  return toHex(agg.serialize());
}

/**
 * input:
 *   pubkey: bytes48 -- the pubkey
 *   message: bytes32 -- the message
 *   signature: bytes96 -- the signature to verify against pubkey and message
 * output: bool  -- VALID or INVALID
 */
function verify(input: {pubkey: string; message: string; signature: string}): boolean {
  const {pubkey, message, signature} = input;
  return VERIFY(fromHex(message), fromHex(pubkey), fromHex(signature));
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey] -- the pubkeys
 *   messages: List[bytes32] -- the messages
 *   signature: BLS Signature -- the signature to verify against pubkeys and messages
 * output: bool  --  true (VALID) or false (INVALID)
 * ```
 */
function aggregate_verify(input: {pubkeys: string[]; messages: string[]; signature: string}): boolean {
  const {pubkeys, messages, signature} = input;
  return aggregateVerify(messages.map(fromHex), pubkeys.map(fromHex), fromHex(signature));
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey] -- list of input BLS pubkeys
 *   message: bytes32 -- the message
 *   signature: BLS Signature -- the signature to verify against pubkeys and message
 * output: bool  --  true (VALID) or false (INVALID)
 * ```
 */
function fast_aggregate_verify(input: {pubkeys: string[]; message: string; signature: string}): boolean {
  const {pubkeys, message, signature} = input;
  return fastAggregateVerify(fromHex(message), pubkeys.map(fromHex), fromHex(signature));
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey]
 *   messages: List[Bytes32]
 *   signatures: List[BLS Signature]
 * output: bool -- true (VALID) or false (INVALID)
 */
function batch_verify(input: {pubkeys: string[]; messages: string[]; signatures: string[]}): boolean {
  const length = input.pubkeys.length;
  if (input.messages.length !== length && input.signatures.length !== length) {
    throw new Error("Invalid spec test. Must have same number in each array. Check spec yaml file");
  }
  const sets: SignatureSet[] = [];
  for (let i = 0; i < length; i++) {
    sets.push({
      message: fromHex(input.messages[i]),
      publicKey: fromHex(input.pubkeys[i]),
      signature: fromHex(input.signatures[i]),
    });
  }
  return verifyMultipleAggregateSignatures(sets);
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey] -- list of input BLS pubkeys
 *   message: bytes32 -- the message
 *   signature: BLS Signature -- the signature to verify against pubkeys and message
 * output: bool  --  true (VALID) or false (INVALID)
 * ```
 */
// function eth_fast_aggregate_verify(input: {pubkeys: string[]; message: string; signature: string}): boolean {
//   const {pubkeys, message, signature} = input;

//   if (pubkeys.length === 0 && signature === G2_POINT_AT_INFINITY) {
//     return true;
//   }

//   return fastAggregateVerify(
//     fromHex(message),
//     pubkeys.map((hex) => PublicKey.deserialize(fromHex(hex))),
//     Signature.deserialize(fromHex(signature))
//   );
// }
