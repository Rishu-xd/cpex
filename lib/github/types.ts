export type GitHubTransport = 'extension' | 'server';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
}

export interface GitHubSessionInfo {
  configured: boolean;
  connected: boolean;
  user: GitHubUser | null;
  callbackUrl: string;
  transport?: GitHubTransport;
  extensionInstalled?: boolean;
  extensionOriginAllowed?: boolean;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  updatedAt: string;
}

export interface GitHubBranch {
  name: string;
  commitSha: string;
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
}

export interface GitHubFileLookup {
  exists: boolean;
  sha: string | null;
  content: string | null;
  htmlUrl: string | null;
}

export interface GitHubPushRequest {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}

export interface GitHubPushResponse {
  action: 'created' | 'updated';
  commitSha: string;
  commitUrl: string;
  fileUrl: string;
  path: string;
}

export interface GitHubTargetConfig {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
}
