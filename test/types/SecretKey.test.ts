import { blst, SecretKey } from "../../src";
import { fromHex, runInstanceTestCases } from "../utils";

describe("SecretKey", () => {
  const sampleHex = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000001"
  );
  const zeroHex = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000000"
  );

  runInstanceTestCases<SecretKey>(
    {
      keygen: [
        { id: "from string", args: ["randomString"] },
        { id: "from Buffer", args: [sampleHex] },
      ],
      from_bendian: [{ args: [sampleHex] }],
      from_lendian: [{ args: [sampleHex] }],
      to_bendian: [{ args: [], res: zeroHex }],
      to_lendian: [{ args: [], res: zeroHex }],
    },
    function getSecretKey() {
      return new blst.SecretKey();
    }
  );
});
