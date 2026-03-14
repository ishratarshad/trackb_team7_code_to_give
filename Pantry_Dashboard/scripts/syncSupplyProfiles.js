/**
 * Sync supply_profiles.json from project-root/data into src/data for Vite imports.
 * Run: npm run sync:supply-profiles
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, "..", "..");
const srcDir = join(__dirname, "..", "src", "data");
const sourcePath = join(projectRoot, "data", "supply_profiles.json");
const destPath = join(srcDir, "supply_profiles.json");

if (!existsSync(sourcePath)) {
  console.error(
    `Error: Source file not found: ${sourcePath}\n` +
      "  Supply profiles are generated at project-root/data/supply_profiles.json.\n" +
      "  Run the normalizer pipeline first, then run: npm run sync:supply-profiles"
  );
  process.exit(1);
}

mkdirSync(srcDir, { recursive: true });
copyFileSync(sourcePath, destPath);
console.log("Synced supply_profiles.json to src/data/");
