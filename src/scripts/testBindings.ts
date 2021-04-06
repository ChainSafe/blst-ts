export async function testBindings(binaryPath: string): Promise<void> {
  // eslint-disable-next-line
  require(binaryPath);
}
