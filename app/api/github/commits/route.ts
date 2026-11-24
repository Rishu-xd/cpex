import { NextRequest, NextResponse } from 'next/server';
import { GitHubApiError, listRepositoryCommits } from '@/lib/github/client';
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
  const rawPath = request.nextUrl.searchParams.get('path');

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

  let filePath: string | undefined;
  if (rawPath && rawPath.trim().length > 0) {
    const normalized = normalizeRepoFilePath(rawPath);
    if (!normalized) {
      return NextResponse.json(
        { error: 'Invalid file path filter.' },
        { status: 400 }
      );
    }
    filePath = normalized;
  }

  try {
    const commits = await listRepositoryCommits(
      token,
      owner,
      repo,
      branch,
      filePath
    );
    return NextResponse.json({ commits });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) await clearGitHubTokenCookie();
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to load commits.' },
      { status: 500 }
    );
  }
}
