import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryFile, GitHubApiError } from '@/lib/github/client';
import { clearGitHubTokenCookie, getGitHubAccessToken } from '@/lib/github/session';
import {
  isValidBranchName,
  isValidGitHubIdentifier,
  normalizeRepoFilePath,
} from '@/lib/github/validation';

export async function GET(request: NextRequest) {
  const token = await getGitHubAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: 'GitHub account is not connected.' },
      { status: 401 }
    );
  }

  const owner = request.nextUrl.searchParams.get('owner')?.trim() ?? '';
  const repo = request.nextUrl.searchParams.get('repo')?.trim() ?? '';
  const branch = request.nextUrl.searchParams.get('branch')?.trim() ?? '';
  const rawPath = request.nextUrl.searchParams.get('path') ?? '';

  if (
    !isValidGitHubIdentifier(owner) ||
    !isValidGitHubIdentifier(repo) ||
    !isValidBranchName(branch)
  ) {
    return NextResponse.json(
      { error: 'Invalid repository or branch parameter.' },
      { status: 400 }
    );
  }

  const normalizedPath = normalizeRepoFilePath(rawPath);
  if (!normalizedPath) {
    return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });
  }

  try {
    const file = await getRepositoryFile(
      token,
      owner,
      repo,
      branch,
      normalizedPath
    );
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) await clearGitHubTokenCookie();
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to inspect repository file.' },
      { status: 500 }
    );
  }
}
