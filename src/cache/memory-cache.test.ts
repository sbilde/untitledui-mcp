import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "./memory-cache.js";

describe("MemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should store and retrieve values", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 60);
    expect(cache.get("key1")).toBe("value1");
  });

  it("should return undefined for missing keys", () => {
    const cache = new MemoryCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should expire entries after TTL", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 60);

    vi.advanceTimersByTime(61 * 1000);

    expect(cache.get("key1")).toBeUndefined();
  });

  it("should clear all entries", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 60);
    cache.set("key2", "value2", 60);

    cache.clear();

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });

  it("should clear entries matching pattern", () => {
    const cache = new MemoryCache();
    cache.set("component:button", "data1", 60);
    cache.set("component:input", "data2", 60);
    cache.set("search:button", "data3", 60);

    const cleared = cache.clearPattern("component:");

    expect(cleared).toBe(2);
    expect(cache.get("component:button")).toBeUndefined();
    expect(cache.get("search:button")).toBe("data3");
  });
});
