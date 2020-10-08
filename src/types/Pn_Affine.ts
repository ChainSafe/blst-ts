export interface Pn_AffineConstructor<Pn, Pn_Affine> {
  new (): Pn_Affine;
  /**
   * ```c++
   * Pn_Affine(const byte *in)
   * ```
   */
  new (bytes: Uint8Array): Pn_Affine;
  /**
   * ```c++
   * Pn_Affine(const P1 &jacobian);
   * ```
   */
  new (p1: Pn): Pn_Affine;
}

export interface Pn_Affine<Pn> {
  /**
   * ```c++
   * P1 to_jacobian() const;
   * ```
   */
  to_jacobian(): Pn;
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
   * bool on_curve() const
   * ```
   */
  on_curve(): boolean;
  /**
   * ```c++
   * bool in_group() const
   * ```
   */
  in_group(): boolean;
  /**
   * ```c++
   * bool is_inf() const
   * ```
   */
  is_inf(): boolean;
}
