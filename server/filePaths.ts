import fs from "fs";
import path from "path";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const OUTPUT_DIR = path.resolve(process.cwd(), "output");

for (const dir of [UPLOAD_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}