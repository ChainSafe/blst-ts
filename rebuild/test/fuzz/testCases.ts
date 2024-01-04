import {SecretKey} from "../../lib";

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
];
