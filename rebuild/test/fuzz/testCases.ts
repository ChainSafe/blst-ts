import {SecretKey} from "../../lib";
import {FuzzTestCase} from "./types";

export const testCases: FuzzTestCase[] = [
  {
    name: "SecretKey.fromKeygen",
    target: (data: Buffer) => SecretKey.fromKeygen(data),
  },
];
