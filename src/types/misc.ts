export enum BLST_ERROR {
  BLST_SUCCESS = 0,
  BLST_BAD_ENCODING = 1,
  BLST_POINT_NOT_ON_CURVE = 2,
  BLST_POINT_NOT_IN_GROUP = 3,
  BLST_AGGR_TYPE_MISMATCH = 4,
  BLST_VERIFY_FAIL = 5,
  BLST_PK_IS_INFINITY = 6,
}

export type Msg = string | Uint8Array;

export type DST = string;
