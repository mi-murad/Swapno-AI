import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(appRoot, "dist");

if (dirname(outputPath) !== appRoot || basename(outputPath) !== "dist") {
  throw new Error("Refusing to clean an unexpected build output path.");
}

await rm(outputPath, { recursive: true, force: true });
