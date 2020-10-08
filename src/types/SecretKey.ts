export interface SecretKeyConstructor {
  new (): SecretKey;
}

export interface SecretKey {
  /**
   * ```c++
   * void keygen(
   *   const byte *IKM, size_t IKM_len,
   *   const std::string &info = ""
   * )
   * ```
   */
  keygen(bytes: string | Uint8Array): void;
  /**
   * ```c++
   * from_bendian(const byte in[32])
   * ```
   */
  from_bendian(bytes: Uint8Array): void;
  /**
   * ```c++
   * from_lendian(const byte in[32])
   * ```
   */
  from_lendian(bytes: Uint8Array): void;
  /**
   * ```c++
   * to_bendian(byte out[32]) const
   * ```
   */
  to_bendian(): Uint8Array;
  /**
   * ```c++
   * to_lendian(byte out[32]) const
   * ```
   */
  to_lendian(): Uint8Array;
}
