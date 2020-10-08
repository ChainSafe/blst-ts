import { BLST_ERROR } from "./config";

export interface PairingConstructor {
  new (noIdea: boolean, DST: string): Pairing;
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
   * @param pk
   * @param sig
   * @param msg
   * @param pk_for_wire
   */
  aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    msg: string | Uint8Array,
    pk_for_wire: Uint8Array
  ): BLST_ERROR;
  /**
   * ```c++
   * void commit()
   * ```
   */
  commit(): void;
  /**
   * ```c++
   * bool finalverify(const PT *sig = nullptr) const
   * ```
   */
  finalverify(): boolean;
}
