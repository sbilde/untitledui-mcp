/**
 * Parse base component dependencies from component file contents.
 * UntitledUI uses imports like: import { Button } from "@/components/base/buttons/button"
 */

export interface ParsedDependency {
  type: "base" | "application" | "foundations" | "shared-assets";
  path: string;
  fullImport: string;
}

/**
 * Extract @/components imports from code files.
 */
export function parseComponentImports(files: Array<{ content?: string; code?: string }>): ParsedDependency[] {
  const imports = new Set<string>();
  const regex = /@\/components\/(base|application|foundations|shared-assets)\/([^"']+)/g;

  for (const file of files) {
    const code = file.content || file.code || "";
    let match;
    while ((match = regex.exec(code)) !== null) {
      imports.add(match[0]);
    }
  }

  const parsed: ParsedDependency[] = [];
  for (const imp of imports) {
    const match = imp.match(/@\/components\/(base|application|foundations|shared-assets)\/(.+)/);
    if (match) {
      parsed.push({
        type: match[1] as ParsedDependency["type"],
        path: match[2],
        fullImport: imp,
      });
    }
  }

  return parsed;
}

/**
 * Extract just the base component names that need to be fetched.
 * Returns unique base component paths like ["avatar/avatar", "buttons/button", "input/input"]
 */
export function extractBaseComponentPaths(files: Array<{ content?: string; code?: string }>): string[] {
  const deps = parseComponentImports(files);
  const basePaths = new Set<string>();

  for (const dep of deps) {
    if (dep.type === "base") {
      // Get the component folder (e.g., "avatar/avatar" → "avatar", "buttons/button" → "buttons")
      basePaths.add(dep.path);
    }
  }

  return Array.from(basePaths);
}

/**
 * Get unique base component names for fetching.
 * Maps paths like "avatar/avatar", "buttons/button" to component names like "avatar", "button"
 */
export function getBaseComponentNames(files: Array<{ content?: string; code?: string }>): string[] {
  const paths = extractBaseComponentPaths(files);
  const names = new Set<string>();

  for (const path of paths) {
    // Extract the main component name from paths like:
    // - "avatar/avatar" → "avatar"
    // - "buttons/button" → "button"
    // - "buttons/button-utility" → "button" (same component folder)
    // - "input/input" → "input"
    // - "input/hint-text" → "input" (same component folder)
    const parts = path.split("/");
    if (parts.length >= 1) {
      names.add(parts[0]); // Use the folder name as the component name
    }
  }

  return Array.from(names);
}
