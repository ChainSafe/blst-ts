import { blst, SecretKey } from "../../../src/bindings";
import { fromHex, runInstanceTestCases } from "../../utils";

describe("SecretKey", () => {
  const sampleHex = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000001"
  );
  const zeroHex = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000000"
  );
  const info = "info";

  runInstanceTestCases<SecretKey>(
    {
      keygen: [
        { id: "from string", args: ["randomString".padEnd(32, "0")] },
        { id: "from Buffer", args: [sampleHex] },
        { id: "with two args", args: [sampleHex, info] },
        { id: "from short ikm", args: [new Uint8Array([0])] },
        // info param can't be a Uint8Array
        // { id: "With two args", args: [sampleHex, zeroHex] },
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
