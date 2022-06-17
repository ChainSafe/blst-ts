import {
  P1_AffineConstructor,
  P1Constructor,
  P2_AffineConstructor,
  P2Constructor,
  PairingConstructor,
  PTConstructor,
  SecretKeyConstructor,
} from "../../src/bindings";

export const initialized: Promise<void>;

// BLS12_381_G1: P1_Affine;
// BLS12_381_NEG_G1: P1_Affine;
// BLS12_381_G2: P2_Affine;
// BLS12_381_NEG_G2: P2_Affine;
export const SecretKey: SecretKeyConstructor;
export const P1_Affine: P1_AffineConstructor;
export const P2_Affine: P2_AffineConstructor;
export const P1: P1Constructor;
export const P2: P2Constructor;
export const PT: PTConstructor;
export const Pairing: PairingConstructor;
export const G1: () => P1;
export const G2: () => P2;
