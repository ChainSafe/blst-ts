import {testBindings} from "./testBindings";
import {downloadReleaseAsset} from "./downloadReleaseAsset";
import {getBinaryName} from "./paths_node";

export async function downloadBindings(binaryPath: string): Promise<void> {
  const binaryName = getBinaryName();

  await downloadReleaseAsset(binaryName, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
