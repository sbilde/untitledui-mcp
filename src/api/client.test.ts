import { describe, it, expect, vi, beforeEach } from "vitest";
import { UntitledUIClient } from "./client.js";

describe("UntitledUIClient", () => {
  describe("validateLicense", () => {
    it("should return true for valid license", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      });

      const result = await client.validateLicense();
      expect(result).toBe(true);
    });

    it("should return false for invalid license", async () => {
      const client = new UntitledUIClient("invalid-key");

      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
      });

      const result = await client.validateLicense();
      expect(result).toBe(false);
    });
  });

  describe("listComponentTypes", () => {
    it("should return array of types", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          types: ["application", "base", "foundations"]
        }),
      });

      const result = await client.listComponentTypes();
      expect(result).toEqual(["application", "base", "foundations"]);
    });
  });
});
