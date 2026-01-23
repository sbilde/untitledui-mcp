// UntitledUI API Response Types

export interface ComponentType {
  types: string[];
}

export interface ComponentListItem {
  name: string;
  type: "file" | "dir";
  count?: number;
}

export interface ComponentListResponse {
  components: ComponentListItem[] | ComponentListWithSubfolder[];
}

export interface ComponentListWithSubfolder {
  [subfolder: string]: ComponentListItem[];
}

export interface ComponentFile {
  path: string;
  code: string;
}

export interface FetchedComponent {
  name: string;
  files: ComponentFile[];
  dependencies?: string[];
  devDependencies?: string[];
  components?: BaseComponentRef[];
}

export interface BaseComponentRef {
  name: string;
  path: string;
}

export interface ComponentsResponse {
  components: FetchedComponent[];
  pro?: string[];
}

export interface ExampleResponse {
  type: "json-file" | "directory" | "json-files" | "error";
  content?: ExampleContent;
  results?: string[];
  status?: number;
  message?: string;
}

export interface ExampleContent {
  name: string;
  files: ComponentFile[];
  dependencies?: string[];
  devDependencies?: string[];
  components?: BaseComponentRef[];
}

// MCP Tool Response Types

export interface MCPComponentResponse {
  name: string;
  type: string;
  description: string;
  files: ComponentFile[];
  dependencies: string[];
  devDependencies: string[];
  baseComponents: string[];
}

export interface MCPSearchResult {
  name: string;
  type: string;
  fullPath: string;
  matchType: "exact" | "partial";
  score: number;
}

export interface MCPErrorResponse {
  error: string;
  code: "INVALID_LICENSE" | "NOT_FOUND" | "API_ERROR" | "NETWORK_ERROR";
  suggestions?: string[];
}
