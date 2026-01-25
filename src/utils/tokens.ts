/**
 * Token estimation utilities.
 * Rough estimate: 1 token ≈ 4 characters for code.
 */

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export function estimateFileTokens(file: { code?: string; content?: string }): number {
  const content = file.code || file.content || "";
  return estimateTokens(content);
}

export function estimateComponentTokens(files: Array<{ code?: string; content?: string; path?: string }>): number {
  return files.reduce((sum, file) => sum + estimateFileTokens(file), 0);
}

export interface FileWithTokens {
  path: string;
  tokens: number;
}

export function getFileTokenList(files: Array<{ path: string; code?: string; content?: string }>): FileWithTokens[] {
  return files.map(file => ({
    path: file.path,
    tokens: estimateFileTokens(file),
  }));
}

// Token limit for Claude Code's Read tool
export const CLAUDE_READ_TOKEN_LIMIT = 25000;

export function isLikelyTooLarge(estimatedTokens: number): boolean {
  return estimatedTokens > CLAUDE_READ_TOKEN_LIMIT;
}
