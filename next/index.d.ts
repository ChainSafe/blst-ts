/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export function aggregatePublicKeys(pks: Array<PublicKey>, pksValidate?: boolean | undefined | null): PublicKey
export function aggregateSignatures(sigs: Array<Signature>, sigsGroupcheck?: boolean | undefined | null): Signature
export function verify(msg: Uint8Array, pk: PublicKey, sig: Signature, pkValidate?: boolean | undefined | null, sigGroupcheck?: boolean | undefined | null): boolean
export function aggregateVerify(msgs: Array<Uint8Array>, pks: Array<PublicKey>, sig: Signature, pkValidate?: boolean | undefined | null, sigsGroupcheck?: boolean | undefined | null): boolean
export function fastAggregateVerify(msg: Uint8Array, pks: Array<PublicKey>, sig: Signature, sigsGroupcheck?: boolean | undefined | null): boolean
export function fastAggregateVerifyPreAggregated(msg: Uint8Array, pk: PublicKey, sig: Signature, sigsGroupcheck?: boolean | undefined | null): boolean
export function verifyMultipleAggregateSignatures(msgs: Array<Uint8Array>, pks: Array<PublicKey>, sigs: Array<Signature>, pksValidate?: boolean | undefined | null, sigsGroupcheck?: boolean | undefined | null): boolean
export class SecretKey {
  static fromKeygen(ikm: Uint8Array, keyInfo?: Uint8Array | undefined | null): SecretKey
  static fromBytes(bytes: Uint8Array): SecretKey
  toBytes(): Uint8Array
  toPublicKey(): PublicKey
  sign(msg: Uint8Array): Signature
}
export class PublicKey {
  static fromBytes(bytes: Uint8Array): PublicKey
  toBytes(): Uint8Array
}
export class Signature {
  static fromBytes(bytes: Uint8Array): Signature
  toBytes(): Uint8Array
}
