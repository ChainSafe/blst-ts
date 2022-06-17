import fs from "fs";
import path from "path";

// eslint-disable-next-line prefer-const
let [inputPath, outputPath = ""]: string[] = process.argv.slice(2);

if (outputPath === "") {
  const inputDir = path.dirname(inputPath);
  const inputBase = path.basename(inputPath);
  outputPath = path.join(inputDir, inputBase + ".js");
}

// TODO: something slightly fancier
// fs.createReadStream(inputPath);
const data = fs.readFileSync(inputPath);
const js_contents = `
import { Buffer } from "buffer";
export default Buffer.from("${Buffer.from(data).toString("base64")}", "base64").buffer;`;

fs.writeFileSync(outputPath, js_contents);
