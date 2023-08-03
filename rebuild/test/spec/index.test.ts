import {expect} from "chai";
import fs from "fs";
import path from "path";
import jsYaml from "js-yaml";
import {SPEC_TEST_LOCATION} from "./specTestVersioning";
import blst from "../../lib";
import {fromHex, toHex} from "../utils";

// Example full path
// blst-ts/spec-tests/tests/general/altair/bls/eth_aggregate_pubkeys/small/eth_aggregate_pubkeys_empty_list

const G2_POINT_AT_INFINITY =
  "0xc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const G1_POINT_AT_INFINITY =
  "0xc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

const testRootDirByFork = path.join(SPEC_TEST_LOCATION, "tests/general");
for (const fork of fs.readdirSync(testRootDirByFork)) {
  // fork = "phase0" | "altair"
  const testRootDirFork = path.join(testRootDirByFork, fork, "bls");

  if (!fs.existsSync(testRootDirFork)) continue;

  for (const testType of fs.readdirSync(testRootDirFork)) {
    // testType = "eth_aggregate_pubkeys" | "fast_aggregate_verify" | ...
    const testTypeDir = path.join(testRootDirFork, testType);
    describe(path.join(fork, testType), () => {
      const testFnByType: Record<string, (data: any) => any> = {
        aggregate,
        aggregate_verify,
        eth_aggregate_pubkeys,
        eth_fast_aggregate_verify,
        fast_aggregate_verify,
        sign,
        verify,
      };
      const testFn = testFnByType[testType];

      before("Known testFn", () => {
        if (!testFn) throw Error(`Unknown testFn ${testType}`);
      });

      for (const testCaseGroup of fs.readdirSync(testTypeDir)) {
        // testCaseGroup = "small"
        const testCaseGroupDir = path.join(testTypeDir, testCaseGroup);

        for (const testCase of fs.readdirSync(testCaseGroupDir)) {
          // testCase = "eth_aggregate_pubkeys_empty_list"
          const testCaseDir = path.join(testCaseGroupDir, testCase);

          it(testCase, () => {
            // Ensure there are no unknown files
            const files = fs.readdirSync(testCaseDir);
            expect(files).to.deep.equal(["data.yaml"], `Unknown files in ${testCaseDir}`);

            // Examples of parsed YAML
            // {
            //   input: [
            //     '0x91347bccf740d859038fcdcaf233eeceb2a436bcaaee9b2aa3bfb70efe29dfb2677562ccbea1c8e061fb9971b0753c240622fab78489ce96768259fc01360346da5b9f579e5da0d941e4c6ba18a0e64906082375394f337fa1af2b7127b0d121',
            //     '0x9674e2228034527f4c083206032b020310face156d4a4685e2fcaec2f6f3665aa635d90347b6ce124eb879266b1e801d185de36a0a289b85e9039662634f2eea1e02e670bc7ab849d006a70b2f93b84597558a05b879c8d445f387a5d5b653df',
            //     '0xae82747ddeefe4fd64cf9cedb9b04ae3e8a43420cd255e3c7cd06a8d88b7c7f8638543719981c5d16fa3527c468c25f0026704a6951bde891360c7e8d12ddee0559004ccdbe6046b55bae1b257ee97f7cdb955773d7cf29adf3ccbb9975e4eb9'
            //   ],
            //   output: '0x9712c3edd73a209c742b8250759db12549b3eaf43b5ca61376d9f30e2747dbcf842d8b2ac0901d2a093713e20284a7670fcf6954e9ab93de991bb9b313e664785a075fc285806fa5224c82bde146561b446ccfc706a64b8579513cfc4ff1d930'
            // }
            //
            // {
            //   input: ['0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],
            //   output: null
            // }
            //
            // {
            //   input: ...,
            //   output: false
            // }

            const testData = jsYaml.load(fs.readFileSync(path.join(testCaseDir, "data.yaml"), "utf8")) as {
              input: unknown;
              output: unknown;
            };

            if (process.env.DEBUG) {
              // eslint-disable-next-line no-console
              console.log(testData);
            }

            try {
              expect(testFn(testData.input)).to.deep.equal(testData.output);
            } catch (e) {
              // spec test expect a boolean even for invalid inputs
              if (!isBlstError(e)) throw e;

              expect(false).to.deep.equal(Boolean(testData.output));
            }
          });
        }
      }
    });
  }
}

/**
 * ```
 * input: List[BLS Signature] -- list of input BLS signatures
 * output: BLS Signature -- expected output, single BLS signature or empty.
 * ```
 */
function aggregate(input: string[]): string | null {
  const agg = blst.aggregateSignatures(input.map((hex) => blst.Signature.deserialize(fromHex(hex))));
  return toHex(agg.serialize());
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey] -- the pubkeys
 *   messages: List[bytes32] -- the messages
 *   signature: BLS Signature -- the signature to verify against pubkeys and messages
 * output: bool  --  true (VALID) or false (INVALID)
 * ```
 */
function aggregate_verify(input: {pubkeys: string[]; messages: string[]; signature: string}): boolean {
  const {pubkeys, messages, signature} = input;
  return blst.aggregateVerify(
    messages.map(fromHex),
    pubkeys.map((hex) => blst.PublicKey.deserialize(fromHex(hex))),
    blst.Signature.deserialize(fromHex(signature))
  );
}

/**
 * ```
 * input: List[BLS Signature] -- list of input BLS signatures
 * output: BLS Signature -- expected output, single BLS signature or empty.
 * ```
 */
function eth_aggregate_pubkeys(input: string[]): string | null {
  // Don't add this checks in the source as beacon nodes check the pubkeys for inf when onboarding
  for (const pk of input) {
    if (pk === G1_POINT_AT_INFINITY) return null;
  }

  const agg = blst.aggregatePublicKeys(input.map((hex) => blst.PublicKey.deserialize(fromHex(hex))));
  return toHex(agg.serialize());
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey] -- list of input BLS pubkeys
 *   message: bytes32 -- the message
 *   signature: BLS Signature -- the signature to verify against pubkeys and message
 * output: bool  --  true (VALID) or false (INVALID)
 * ```
 */
function eth_fast_aggregate_verify(input: {pubkeys: string[]; message: string; signature: string}): boolean {
  const {pubkeys, message, signature} = input;

  if (pubkeys.length === 0 && signature === G2_POINT_AT_INFINITY) {
    return true;
  }

  // Don't add this checks in the source as beacon nodes check the pubkeys for inf when onboarding
  for (const pk of pubkeys) {
    if (pk === G1_POINT_AT_INFINITY) return false;
  }

  return blst.fastAggregateVerify(
    fromHex(message),
    pubkeys.map((hex) => blst.PublicKey.deserialize(fromHex(hex))),
    blst.Signature.deserialize(fromHex(signature))
  );
}

/**
 * ```
 * input:
 *   pubkeys: List[BLS Pubkey] -- list of input BLS pubkeys
 *   message: bytes32 -- the message
 *   signature: BLS Signature -- the signature to verify against pubkeys and message
 * output: bool  --  true (VALID) or false (INVALID)
 * ```
 */
function fast_aggregate_verify(input: {pubkeys: string[]; message: string; signature: string}): boolean | null {
  const {pubkeys, message, signature} = input;

  // Don't add this checks in the source as beacon nodes check the pubkeys for inf when onboarding
  for (const pk of pubkeys) {
    if (pk === G1_POINT_AT_INFINITY) return false;
  }

  return blst.fastAggregateVerify(
    fromHex(message),
    pubkeys.map((hex) => blst.PublicKey.deserialize(fromHex(hex))),
    blst.Signature.deserialize(fromHex(signature))
  );
}

/**
 * input:
 *   privkey: bytes32 -- the private key used for signing
 *   message: bytes32 -- input message to sign (a hash)
 * output: BLS Signature -- expected output, single BLS signature or empty.
 */
function sign(input: {privkey: string; message: string}): string | null {
  const {privkey, message} = input;
  const sk = blst.SecretKey.deserialize(fromHex(privkey));
  const signature = sk.sign(fromHex(message));
  return toHex(signature.serialize());
}

/**
 * input:
 *   pubkey: bytes48 -- the pubkey
 *   message: bytes32 -- the message
 *   signature: bytes96 -- the signature to verify against pubkey and message
 * output: bool  -- VALID or INVALID
 */
function verify(input: {pubkey: string; message: string; signature: string}): boolean {
  const {pubkey, message, signature} = input;
  return blst.verify(
    fromHex(message),
    blst.PublicKey.deserialize(fromHex(pubkey)),
    blst.Signature.deserialize(fromHex(signature))
  );
}

function isBlstError(e: unknown): boolean {
  return (e as Error).message.includes("BLST_ERROR");
}
