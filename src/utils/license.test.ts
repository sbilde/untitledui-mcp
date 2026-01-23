import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveLicenseKey } from "./license.js";
import * as fs from "fs";
import * as os from "os";

vi.mock("fs");
vi.mock("os");

describe("resolveLicenseKey", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.UNTITLEDUI_LICENSE_KEY;
  });

  it("should prefer CLI argument over env var", () => {
    process.env.UNTITLEDUI_LICENSE_KEY = "env-key";
    const result = resolveLicenseKey("cli-key");
    expect(result).toBe("cli-key");
  });

  it("should use env var if no CLI argument", () => {
    process.env.UNTITLEDUI_LICENSE_KEY = "env-key";
    const result = resolveLicenseKey();
    expect(result).toBe("env-key");
  });

  it("should read from config file if no env var", () => {
    vi.mocked(os.homedir).mockReturnValue("/home/user");
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ license: "file-key" })
    );

    const result = resolveLicenseKey();
    expect(result).toBe("file-key");
  });

  it("should return undefined if no key found", () => {
    vi.mocked(os.homedir).mockReturnValue("/home/user");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = resolveLicenseKey();
    expect(result).toBeUndefined();
  });
});
