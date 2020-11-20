import { testBindings } from "./testBindings";
import { getBinaryName } from "./paths";
import { downloadReleaseAsset } from "./downloadReleaseAsset";

export async function downloadBindings(binaryPath: string) {
  const binaryName = getBinaryName();

  await downloadReleaseAsset(binaryName, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
