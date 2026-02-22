import { ENDPOINTS } from "./endpoints.js";
import type {
  ComponentListItem,
  ComponentListResponse,
  ComponentsResponse,
  ExampleResponse,
  FetchedComponent,
} from "./types.js";

export class UntitledUIClient {
  constructor(private licenseKey: string) {}

  async validateLicense(): Promise<boolean> {
    try {
      const response = await fetch(ENDPOINTS.validateKey(this.licenseKey));
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async listComponentTypes(): Promise<string[]> {
    const response = await fetch(ENDPOINTS.listTypes(this.licenseKey));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.types;
  }

  async listComponents(type: string, subfolder?: string): Promise<ComponentListItem[]> {
    let url: string;
    if (subfolder) {
      url = ENDPOINTS.listSubfolder(this.licenseKey, type, [subfolder]);
    } else {
      url = ENDPOINTS.listComponents(this.licenseKey, type);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ComponentListResponse = await response.json();

    // Handle subfolder response format
    if (subfolder && Array.isArray(data.components)) {
      const subfolderData = data.components[0];
      if (subfolderData && typeof subfolderData === "object" && subfolder in subfolderData) {
        return (subfolderData as Record<string, ComponentListItem[]>)[subfolder];
      }
    }

    return data.components as ComponentListItem[];
  }

  async fetchComponent(type: string, name: string): Promise<FetchedComponent | null> {
    const response = await fetch(ENDPOINTS.fetchComponents, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        components: [name],
        key: this.licenseKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} fetching ${type}/${name}`);
    }

    const data: ComponentsResponse = await response.json();
    const component = data.components?.[0] || null;

    // Only check pro restriction if the component wasn't returned
    if (!component && data.pro && data.pro.length > 0) {
      throw new Error(`PRO access required for: ${data.pro.join(", ")}`);
    }

    return component;
  }

  async fetchComponents(type: string, names: string[]): Promise<FetchedComponent[]> {
    const response = await fetch(ENDPOINTS.fetchComponents, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        components: names,
        key: this.licenseKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} fetching ${type}/${names.join(", ")}`);
    }

    const data: ComponentsResponse = await response.json();
    const components = data.components || [];

    // Only check pro restriction for components that weren't returned
    if (components.length === 0 && data.pro && data.pro.length > 0) {
      throw new Error(`PRO access required for: ${data.pro.join(", ")}`);
    }

    return components;
  }

  /**
   * Browse examples hierarchy or fetch example content.
   * - "" → lists types (application, marketing)
   * - "application" → lists examples (dashboards-01, settings-01, etc.)
   * - "application/dashboards-01" → lists pages (01, 02, 03, ...)
   * - "application/dashboards-01/01" → returns actual content
   */
  async fetchExample(path: string): Promise<ExampleResponse> {
    const response = await fetch(ENDPOINTS.fetchExample, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        example: path,
        key: this.licenseKey,
      }),
    });

    return response.json();
  }

  /**
   * Fetch all pages in an example and combine them.
   * Path should be "application/dashboards-01" (without page number).
   */
  async fetchFullExample(examplePath: string): Promise<{
    name: string;
    pages: Array<{
      page: string;
      files: Array<{ path: string; code: string }>;
      dependencies: string[];
      devDependencies: string[];
    }>;
    allDependencies: string[];
    allDevDependencies: string[];
    totalFiles: number;
  }> {
    // First, list all pages in the example
    const listing = await this.fetchExample(examplePath);

    if (listing.type !== "directory" || !listing.results) {
      throw new Error(`Invalid example path: ${examplePath}. Expected a directory with pages.`);
    }

    const pages = listing.results;
    const allDeps = new Set<string>();
    const allDevDeps = new Set<string>();
    const fetchedPages: Array<{
      page: string;
      files: Array<{ path: string; code: string }>;
      dependencies: string[];
      devDependencies: string[];
    }> = [];

    // Fetch each page
    for (const page of pages) {
      const pageData = await this.fetchExample(`${examplePath}/${page}`);

      if (pageData.type === "json-file" && pageData.content) {
        const content = pageData.content;

        fetchedPages.push({
          page,
          files: content.files || [],
          dependencies: content.dependencies || [],
          devDependencies: content.devDependencies || [],
        });

        content.dependencies?.forEach(d => allDeps.add(d));
        content.devDependencies?.forEach(d => allDevDeps.add(d));
      }
    }

    const totalFiles = fetchedPages.reduce((sum, p) => sum + p.files.length, 0);

    return {
      name: examplePath,
      pages: fetchedPages,
      allDependencies: Array.from(allDeps),
      allDevDependencies: Array.from(allDevDeps),
      totalFiles,
    };
  }
}
