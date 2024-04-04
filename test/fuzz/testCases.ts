import {verify, SecretKey, PublicKey, Signature} from "../../rebuild/lib";

export interface FuzzTestCase {
  name: string;
  target: (data: Buffer) => any;
  expectedErrors: string[];
}

export const testCases: FuzzTestCase[] = [
  {
    name: "SecretKey.fromKeygen",
    target: (data: Buffer) => {
      return SecretKey.fromKeygen(data);
    },
    expectedErrors: ["ikm must be greater than or equal to 32 bytes"],
  },
  {
    name: "SecretKey.deserialize",
    target: (data: Buffer) => {
      return SecretKey.deserialize(data);
    },
    expectedErrors: ["BLST_ERROR: skBytes must be 32 bytes long"],
  },
  {
    name: "secretKey.sign",
    target: (data: Buffer) => {
      return SecretKey.fromKeygen(Buffer.alloc(32), "*").sign(data);
    },
    expectedErrors: [],
  },
  {
    name: "PublicKey.deserialize",
    target: (data: Buffer) => {
      return PublicKey.deserialize(data);
    },
    expectedErrors: [
      "BLST_ERROR::BLST_PK_IS_INFINITY",
      "BLST_ERROR::BLST_POINT_NOT_IN_GROUP",
      "BLST_ERROR::BLST_POINT_NOT_ON_CURVE",
      "BLST_ERROR::BLST_BAD_ENCODING",
      "BLST_ERROR: pkBytes must be 48 or 96 bytes long",
    ],
  },
  {
    name: "Signature.deserialize",
    target: (data: Buffer) => {
      return Signature.deserialize(data);
    },
    expectedErrors: [
      "BLST_ERROR::BLST_POINT_NOT_IN_GROUP",
      "BLST_ERROR::BLST_POINT_NOT_ON_CURVE",
      "BLST_ERROR::BLST_BAD_ENCODING",
      "BLST_ERROR: sigBytes must be 96 or 192 bytes long",
    ],
  },
  {
    name: "verify",
    target: (data: Buffer) => {
      const secretKey = SecretKey.fromKeygen(Buffer.alloc(32, "*"));
      const publicKey = secretKey.toPublicKey();
      const signature = secretKey.sign(data);
      return verify(data, publicKey, signature);
    },
    expectedErrors: [],
  },
];
