import { P1Constructor, P1_AffineConstructor } from "./P1";
import { P2Constructor, P2_AffineConstructor } from "./P2";
import { PairingConstructor } from "./Pairing";
import { SecretKey } from "./SecretKey";

export interface Blst {
  SecretKey: SecretKeyConstructor;
  P1_Affine: P1_AffineConstructor;
  P2_Affine: P2_AffineConstructor;
  P1: P1Constructor;
  P2: P2Constructor;
  PT: any;
  Pairing: PairingConstructor;
}

interface SecretKeyConstructor {
  new (): SecretKey;
}
