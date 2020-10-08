import { PnConstructor, Pn } from "./Pn";
import { Pn_AffineConstructor, Pn_Affine } from "./Pn_Affine";

export type P1Constructor = PnConstructor<P1, P1_Affine>;
export type P1_AffineConstructor = Pn_AffineConstructor<P1, P1_Affine>;
export type P1 = Pn<P1_Affine>;
export type P1_Affine = Pn_Affine<P1>;
