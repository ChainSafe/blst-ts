import fs from "fs";
import https from "https";

export class HttpError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 */
export function download(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(
          new HttpError(
            `Failed to get '${url}' (${response.statusCode})`,
            response.statusCode
          )
        );
        return;
      }

      response.pipe(file);
    });

    // The destination stream is ended by the time it's called
    file.on("finish", () => resolve());

    request.on("error", (err) => {
      fs.unlink(filePath, () => reject(err));
    });

    file.on("error", (err) => {
      fs.unlink(filePath, () => reject(err));
    });

    request.end();
  });
}
