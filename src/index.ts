#!/usr/bin/env node

import { resolveLicenseKey } from "./utils/license.js";
import { runServer } from "./server.js";
import { UntitledUIClient } from "./api/client.js";

async function main() {
  const args = process.argv.slice(2);

  // Parse CLI arguments
  let cliLicenseKey: string | undefined;
  let testMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--license-key" && args[i + 1]) {
      cliLicenseKey = args[i + 1];
      i++;
    } else if (args[i] === "--test") {
      testMode = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
mcp-untitledui - MCP server for UntitledUI Pro components

Usage:
  mcp-untitledui [options]

Options:
  --license-key <key>  Specify license key (overrides env/config)
  --test               Test connection and exit
  --help, -h           Show this help message

Environment:
  UNTITLEDUI_LICENSE_KEY  License key (if not using --license-key)

Config:
  ~/.untitledui/config.json  Auto-detected from UntitledUI CLI login
`);
      process.exit(0);
    }
  }

  // Resolve license key
  const licenseKey = resolveLicenseKey(cliLicenseKey);

  if (!licenseKey) {
    console.error("Error: No license key found.");
    console.error("");
    console.error("Please provide a license key via one of:");
    console.error("  1. CLI argument: --license-key <key>");
    console.error("  2. Environment: UNTITLEDUI_LICENSE_KEY=<key>");
    console.error("  3. Login via CLI: npx untitledui login");
    process.exit(1);
  }

  // Test mode
  if (testMode) {
    console.log("Testing connection...");
    const client = new UntitledUIClient(licenseKey);

    const valid = await client.validateLicense();
    if (!valid) {
      console.error("✗ License key is invalid");
      process.exit(1);
    }
    console.log("✓ License key is valid");

    try {
      const types = await client.listComponentTypes();
      console.log(`✓ API connection successful`);
      console.log(`✓ ${types.length} component types available`);
      console.log("✓ Ready to serve");
      process.exit(0);
    } catch (error) {
      console.error("✗ API connection failed:", error);
      process.exit(1);
    }
  }

  // Run server
  await runServer(licenseKey);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
