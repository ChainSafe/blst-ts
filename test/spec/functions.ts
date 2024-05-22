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
  verifyMultipleAggregateSignatures,
} from "../../lib";
import {fromHex, toHex} from "../utils";
import {G1_POINT_AT_INFINITY, G2_POINT_AT_INFINITY} from "./utils";

export const testFnByName: Record<string, (data: any) => any> = {
  sign,
  eth_aggregate_pubkeys,
  aggregate,
  verify,
  aggregate_verify,
  fast_aggregate_verify,
  eth_fast_aggregate_verify,
  batch_verify,
  deserialization_G1,
  deserialization_G2,
};

/**
 * ```
 * input: List[BLS Signature] -- list of input BLS signatures
 * output: BLS Signature -- expected output, single BLS signature or empty.
 * ```
 */
function aggregate(input: string[]): string | null {
  const agg = aggregateSignatures(input.map((hex) => Signature.deserialize(fromHex(hex))));
  return toHex(agg.serialize());
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
  return aggregateVerify(
    messages.map(fromHex),
    pubkeys.map((hex) => PublicKey.deserialize(fromHex(hex))),
    Signature.deserialize(fromHex(signature))
  );
}

/**
 * ```
 * input: List[BLS Signature] -- list of input BLS signatures
 * output: BLS Signature -- expected output, single BLS signature or empty.
 * ```
 */
function eth_aggregate_pubkeys(input: string[]): string | null {
  // Don't add this checks in the source as beacon nodes check the pubkeys for inf when onboarding
  for (const pk of input) {
    if (pk === G1_POINT_AT_INFINITY) return null;
  }

  const agg = aggregatePublicKeys(input.map((hex) => PublicKey.deserialize(fromHex(hex))));
  return toHex(agg.serialize());
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
function eth_fast_aggregate_verify(input: {pubkeys: string[]; message: string; signature: string}): boolean {
  const {pubkeys, message, signature} = input;

  if (pubkeys.length === 0 && signature === G2_POINT_AT_INFINITY) {
    return true;
  }

  // Don't add this checks in the source as beacon nodes check the pubkeys for inf when onboarding
  for (const pk of pubkeys) {
    if (pk === G1_POINT_AT_INFINITY) return false;
  }

  return fastAggregateVerify(
    fromHex(message),
    pubkeys.map((hex) => PublicKey.deserialize(fromHex(hex))),
    Signature.deserialize(fromHex(signature))
  );
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
function fast_aggregate_verify(input: {pubkeys: string[]; message: string; signature: string}): boolean | null {
  const {pubkeys, message, signature} = input;

  // Don't add this checks in the source as beacon nodes check the pubkeys for inf when onboarding
  for (const pk of pubkeys) {
    if (pk === G1_POINT_AT_INFINITY) return false;
  }

  return fastAggregateVerify(
    fromHex(message),
    pubkeys.map((hex) => PublicKey.deserialize(fromHex(hex))),
    Signature.deserialize(fromHex(signature))
  );
}

/**
 * input:
 *   privkey: bytes32 -- the private key used for signing
 *   message: bytes32 -- input message to sign (a hash)
 * output: BLS Signature -- expected output, single BLS signature or empty.
 */
function sign(input: {privkey: string; message: string}): string | null {
  const {privkey, message} = input;
  const sk = SecretKey.deserialize(fromHex(privkey));
  const signature = sk.sign(fromHex(message));
  return toHex(signature.serialize());
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
  return VERIFY(fromHex(message), PublicKey.deserialize(fromHex(pubkey)), Signature.deserialize(fromHex(signature)));
}

/**
 * ```
 * input:
 *   pubkeys: List[bytes48] -- the pubkeys
 *   messages: List[bytes32] -- the messages
 *   signatures: List[bytes96] -- the signatures to verify against pubkeys and messages
 * output: bool  -- VALID or INVALID
 * ```
 * https://github.com/ethereum/bls12-381-tests/blob/master/formats/batch_verify.md
 */
function batch_verify(input: {pubkeys: string[]; messages: string[]; signatures: string[]}): boolean | null {
  const {pubkeys, messages, signatures} = input;
  try {
    return verifyMultipleAggregateSignatures(
      pubkeys.map((pubkey, i) => {
        const publicKey = PublicKey.deserialize(fromHex(pubkey), CoordType.jacobian);
        publicKey.keyValidate();
        const signature = Signature.deserialize(fromHex(signatures[i]), undefined);
        signature.sigValidate();
        return {
          publicKey,
          message: fromHex(messages[i]),
          signature,
        };
      })
    );
  } catch (e) {
    return false;
  }
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
