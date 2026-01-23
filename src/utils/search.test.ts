import { describe, it, expect } from "vitest";
import { fuzzySearch, type SearchableItem } from "./search.js";

describe("fuzzySearch", () => {
  const items: SearchableItem[] = [
    { name: "button", type: "base", fullPath: "base/button" },
    { name: "date-picker", type: "application", fullPath: "application/date-picker" },
    { name: "date-range-picker", type: "application", fullPath: "application/date-range-picker" },
    { name: "ai-assistant-modal", type: "application", fullPath: "application/modals/ai-assistant-modal" },
  ];

  it("should find exact matches", () => {
    const results = fuzzySearch("button", items);
    expect(results[0].name).toBe("button");
    expect(results[0].matchType).toBe("exact");
  });

  it("should find partial matches", () => {
    const results = fuzzySearch("date", items);
    expect(results.length).toBe(2);
    expect(results.every(r => r.name.includes("date"))).toBe(true);
  });

  it("should rank exact matches higher", () => {
    const results = fuzzySearch("date-picker", items);
    expect(results[0].name).toBe("date-picker");
    expect(results[0].matchType).toBe("exact");
  });

  it("should return empty array for no matches", () => {
    const results = fuzzySearch("nonexistent", items);
    expect(results).toEqual([]);
  });

  it("should limit results", () => {
    const results = fuzzySearch("a", items, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
