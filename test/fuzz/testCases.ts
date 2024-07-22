import {verify, SecretKey, PublicKey, Signature} from "../../index.js";

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
    expectedErrors: ["Invalid encoding"],
  },
  {
    name: "SecretKey.deserialize",
    target: (data: Buffer) => {
      return SecretKey.fromBytes(data);
    },
    expectedErrors: ["Invalid encoding"],
  },
  {
    name: "secretKey.sign",
    target: (data: Buffer) => {
      return SecretKey.fromKeygen(Buffer.alloc(32), Buffer.from("*")).sign(data);
    },
    expectedErrors: [],
  },
  {
    name: "PublicKey.deserialize",
    target: (data: Buffer) => {
      return PublicKey.fromBytes(data);
    },
    expectedErrors: ["Invalid encoding", "Point not on curve", "Point not in group", "Public key is infinity"],
  },
  {
    name: "Signature.deserialize",
    target: (data: Buffer) => {
      return Signature.fromBytes(data);
    },
    expectedErrors: ["Invalid encoding", "Point not on curve", "Point not in group"],
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
