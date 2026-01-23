export interface SearchableItem {
  name: string;
  type: string;
  fullPath: string;
}

export interface SearchResult extends SearchableItem {
  matchType: "exact" | "partial";
  score: number;
}

export function fuzzySearch(
  query: string,
  items: SearchableItem[],
  limit = 20
): SearchResult[] {
  const queryLower = query.toLowerCase();

  const results: SearchResult[] = [];

  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const fullPathLower = item.fullPath.toLowerCase();

    let score = 0;
    let matchType: "exact" | "partial" = "partial";

    // Exact match on name
    if (nameLower === queryLower) {
      score = 1.0;
      matchType = "exact";
    }
    // Name starts with query
    else if (nameLower.startsWith(queryLower)) {
      score = 0.9;
    }
    // Name contains query
    else if (nameLower.includes(queryLower)) {
      score = 0.7;
    }
    // Full path contains query
    else if (fullPathLower.includes(queryLower)) {
      score = 0.5;
    }
    // Fuzzy: all query chars appear in order
    else {
      let queryIndex = 0;
      for (const char of nameLower) {
        if (char === queryLower[queryIndex]) {
          queryIndex++;
        }
        if (queryIndex === queryLower.length) {
          score = 0.3;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({
        ...item,
        matchType,
        score,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
