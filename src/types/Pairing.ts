import { BLST_ERROR, DST, Msg } from "./misc";
import { P1_Affine } from "./P1";
import { P2_Affine } from "./P2";
import { PT } from "./PT";

export interface PairingConstructor {
  /**
   * ```c++
   * Pairing(bool hash_or_encode, const byte *DST, size_t DST_len)
   * ```
   */
  new (hash_or_encode: boolean, DST: DST): Pairing;
}

export interface Pairing {
  /**
   * ```c++
   * BLST_ERROR aggregate(
   *   const P1_Affine *pk,
   *   const P2_Affine *sig,
   *   const byte *msg, size_t msg_len,
   *   const byte *aug = nullptr, size_t aug_len = 0
   * )
   * ```
   */
  aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  /**
   * ```c++
   * BLST_ERROR aggregate(
   *   const P2_Affine *pk,
   *   const P1_Affine *sig,
   *   const byte *msg, size_t msg_len,
   *   const byte *aug = nullptr, size_t aug_len = 0
   * )
   * ```
   */
  aggregate(
    pk: P2_Affine,
    sig: P1_Affine,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  /**
   * ```c++
   * BLST_ERROR mul_n_aggregate(
   *   const P1_Affine *pk, const P2_Affine *sig,
   *   const byte *scalar, size_t nbits,
   *   const byte *msg, size_t msg_len,
   *   const byte *aug = nullptr, size_t aug_len = 0
   * )
   * ```
   */
  mul_n_aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    scalar: Uint8Array,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  /**
   * ```c++
   * BLST_ERROR mul_n_aggregate(
   *   const P2_Affine *pk, const P1_Affine *sig,
   *   const byte *scalar, size_t nbits,
   *   const byte *msg, size_t msg_len,
   *   const byte *aug = nullptr, size_t aug_len = 0
   * )
   * ```
   */
  mul_n_aggregate(
    pk: P2_Affine,
    sig: P1_Affine,
    scalar: Uint8Array,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  /**
   * ```c++
   * void commit()
   * ```
   */
  commit(): void;
  /**
   * ```c++
   * BLST_ERROR merge(const Pairing *ctx)
   * ```
   */
  merge(ctx: Pairing): BLST_ERROR;
  /**
   * ```c++
   * bool finalverify(const PT *sig = nullptr) const
   * ```
   */
  finalverify(sig?: PT): boolean;
}
