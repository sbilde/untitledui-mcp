export const API_BASE = "https://www.untitledui.com/react/api";

export const ENDPOINTS = {
  validateKey: (key: string) => `${API_BASE}/validate-key?key=${key}`,
  listTypes: (key: string) => `${API_BASE}/components/list?key=${key}`,
  listComponents: (key: string, type: string) =>
    `${API_BASE}/components/list?key=${key}&type=${type}`,
  listSubfolder: (key: string, type: string, subfolders: string[]) =>
    `${API_BASE}/components/list?key=${key}&type=${type}&subfolders=${subfolders.join(",")}`,
  fetchComponents: `${API_BASE}/components`,
  fetchExample: `${API_BASE}/components/example`,
} as const;
