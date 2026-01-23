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
      throw new Error(`API error: ${response.status}`);
    }

    const data: ComponentsResponse = await response.json();

    if (data.pro && data.pro.length > 0) {
      throw new Error(`PRO access required for: ${data.pro.join(", ")}`);
    }

    return data.components[0] || null;
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
      throw new Error(`API error: ${response.status}`);
    }

    const data: ComponentsResponse = await response.json();

    if (data.pro && data.pro.length > 0) {
      throw new Error(`PRO access required for: ${data.pro.join(", ")}`);
    }

    return data.components;
  }

  async fetchExample(name: string): Promise<ExampleResponse> {
    const response = await fetch(ENDPOINTS.fetchExample, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        example: name,
        key: this.licenseKey,
      }),
    });

    return response.json();
  }
}
