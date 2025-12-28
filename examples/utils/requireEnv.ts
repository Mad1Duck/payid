import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function loadEnvFromParent() {
  let currentDir = process.cwd();

  while (true) {
    const envPath = path.join(currentDir, ".env");

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  throw new Error(".env not found in parent directories");
}

loadEnvFromParent();

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
}
