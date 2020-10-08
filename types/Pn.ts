import { DST, Msg } from "./misc";
import { SecretKey } from "./SecretKey";

export interface PnConstructor<Pn, Pn_Affine> {
  new (): Pn;
  /**
   * ```c++
   * P1(SecretKey &sk)
   * ```
   */
  new (secretKey: SecretKey): Pn;
  /**
   * ```c++
   * P1(const byte *in)
   * ```
   */
  new (bytes: Uint8Array): Pn;
  /**
   * ```c++
   * P1(const P1_Affine &affine)
   * ```
   */
  new (pAffine: Pn_Affine): Pn;
}

export interface Pn<Pn_Affine> {
  /**
   * Pn_Affine to_affine() const
   */
  to_affine(): Pn_Affine;
  /**
   * ```c++
   * void serialize(byte out[96]) const
   * ```
   */
  serialize(): Uint8Array;
  /**
   * ```c++
   * void compress(byte out[48]) const
   * ```
   */
  compress(): Uint8Array;
  /**
   * ```c++
   * bool is_inf() const
   * ```
   */
  is_inf(): boolean;
  /**
   * ```c++
   * void aggregate(const Pn_Affine &in)
   * ```
   */
  aggregate(pAffine: Pn_Affine): void;
  /**
   * Pn *sign_with(SecretKey &sk)
   */
  sign_with(sk: SecretKey): Pn<Pn_Affine>;
  /**
   * Pn *hash_to(const byte *msg, size_t msg_len,
   *   const std::string &DST = "",
   *   const byte *aug = nullptr, size_t aug_len = 0)
   */
  hash_to(msg: Msg, DST: DST, noIdea: any): Pn<Pn_Affine>;
  /**
   * Pn *encode_to(const byte *msg, size_t msg_len,
   *   const std::string &DST = "",
   *   const byte *aug = nullptr, size_t aug_len = 0)
   */
  encode_to(msg: Msg, DST: DST, noIdea: any): Pn<Pn_Affine>;
}
