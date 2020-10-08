import { P1_Affine } from "./P1";
import { P2_Affine } from "./P2";

export interface PTConstructor {
  /**
   * ```c++
   * PT(const P1_Affine &p)
   * ```
   */
  new (p1Affine: P1_Affine): PT;
  /**
   * ```c++
   * PT(const P2_Affine &p)
   * ```
   */
  new (p2Affine: P2_Affine): PT;
}

export interface PT {}
