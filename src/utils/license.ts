import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function getConfigPath(): string {
  return path.join(os.homedir(), ".untitledui", "config.json");
}

export function resolveLicenseKey(cliArg?: string): string | undefined {
  // Priority 1: CLI argument
  if (cliArg) {
    return cliArg;
  }

  // Priority 2: Environment variable
  const envKey = process.env.UNTITLEDUI_LICENSE_KEY;
  if (envKey) {
    return envKey;
  }

  // Priority 3: Config file (~/.untitledui/config.json)
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.license) {
        return config.license;
      }
    }
  } catch {
    // Ignore file read errors
  }

  return undefined;
}
