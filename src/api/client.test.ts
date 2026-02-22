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

  describe("fetchComponent", () => {
    it("should return component when found", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          components: [{ name: "button", files: [], dependencies: [] }],
          pro: [],
        }),
      });

      const result = await client.fetchComponent("base", "button");
      expect(result).toEqual({ name: "button", files: [], dependencies: [] });
    });

    it("should return component even when pro array includes it", async () => {
      const client = new UntitledUIClient("pro-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          components: [{ name: "calendar", files: [], dependencies: [] }],
          pro: ["calendar"],
        }),
      });

      const result = await client.fetchComponent("application", "calendar");
      expect(result).toEqual({ name: "calendar", files: [], dependencies: [] });
    });

    it("should throw when component requires pro and is not returned", async () => {
      const client = new UntitledUIClient("free-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          components: [],
          pro: ["calendar"],
        }),
      });

      await expect(client.fetchComponent("application", "calendar"))
        .rejects.toThrow("PRO access required for: calendar");
    });

    it("should return null when component not found", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          components: [],
          pro: [],
        }),
      });

      const result = await client.fetchComponent("base", "nonexistent");
      expect(result).toBeNull();
    });

    it("should throw on API error with status and component info", async () => {
      const client = new UntitledUIClient("valid-key");

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(client.fetchComponent("base", "featured-icon"))
        .rejects.toThrow("API error: 500 fetching base/featured-icon");
    });
  });
});
