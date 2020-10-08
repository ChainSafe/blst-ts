import { PnConstructor, Pn } from "./Pn";
import { Pn_AffineConstructor, Pn_Affine } from "./Pn_Affine";

export type P2Constructor = PnConstructor<P2, P2_Affine>;
export type P2_AffineConstructor = Pn_AffineConstructor<P2, P2_Affine>;
export type P2 = Pn<P2_Affine>;
export type P2_Affine = Pn_Affine<P2>;
