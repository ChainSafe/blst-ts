const fs = require("fs");
const https = require("https");

class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports.HttpError = HttpError;

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 */
module.exports.download = async function download(url, filePath) {
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
};
