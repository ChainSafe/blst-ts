import {execSync} from "child_process";

// Loading prebuilt bindings may fail in any number of unhappy ways, including a segfault
// We use child processes to catch these unrecoverable process-level errors and continue the installation process

export async function testBindings(binaryPath: string): Promise<void> {
  execSync(`node -e 'require("${binaryPath}")'`);
}
