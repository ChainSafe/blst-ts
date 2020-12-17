import child_process from "child_process";

export async function exec(
  cmd: string,
  options?: child_process.ExecOptions
): Promise<string> {
  return new Promise((resolve, reject): void => {
    const proc = child_process.exec(
      cmd,
      {
        timeout: 3 * 60 * 1000, // ms
        maxBuffer: 10e6, // bytes
        ...options,
      },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout.trim() || stderr || "");
      }
    );
    if (proc.stdout) proc.stdout.pipe(process.stdout);
    if (proc.stderr) proc.stderr.pipe(process.stderr);
  });
}
