import { P1Constructor, P1_AffineConstructor } from "./P1";
import { P2Constructor, P2_AffineConstructor } from "./P2";
import { PTConstructor } from "./PT";
import { PairingConstructor } from "./Pairing";
import { SecretKeyConstructor } from "./SecretKey";
export * from "./P1";
export * from "./P2";
export * from "./PT";
export * from "./Pairing";
export * from "./SecretKey";
export * from "./misc";

export interface Blst {
  SecretKey: SecretKeyConstructor;
  P1_Affine: P1_AffineConstructor;
  P2_Affine: P2_AffineConstructor;
  P1: P1Constructor;
  P2: P2Constructor;
  PT: PTConstructor;
  Pairing: PairingConstructor;
}
