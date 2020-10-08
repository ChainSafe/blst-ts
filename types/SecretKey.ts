export interface SecretKeyConstructor {
  new (): SecretKey;
}

export interface SecretKey {
  keygen(someString: string): void;
  /**
   * ```c++
   * from_bendian(const byte in[32])
   * ```
   * @param byte
   */
  from_bendian(byte: Uint8Array): void;
  /**
   * ```c++
   * from_lendian(const byte in[32])
   * ```
   * @param byte
   */
  from_lendian(byte: Uint8Array): void;
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
