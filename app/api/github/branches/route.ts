import { NextRequest, NextResponse } from 'next/server';
import {
  createRepositoryBranch,
  GitHubApiError,
  listRepositoryBranches,
} from '@/lib/github/client';
import { clearGitHubTokenCookie, getGitHubAccessToken } from '@/lib/github/session';
import {
  isValidBranchName,
  isValidGitHubIdentifier,
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
  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return NextResponse.json(
      { error: 'Invalid repository owner or name.' },
      { status: 400 }
    );
  }

  try {
    const branches = await listRepositoryBranches(token, owner, repo);
    return NextResponse.json({ branches });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) await clearGitHubTokenCookie();
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to load branches.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const token = await getGitHubAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: 'GitHub account is not connected.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const raw = (typeof body === 'object' && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
  const owner = typeof raw.owner === 'string' ? raw.owner.trim() : '';
  const repo = typeof raw.repo === 'string' ? raw.repo.trim() : '';
  const newBranch =
    typeof raw.newBranch === 'string' ? raw.newBranch.trim() : '';
  const baseSha = typeof raw.baseSha === 'string' ? raw.baseSha.trim() : '';

  if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
    return NextResponse.json(
      { error: 'Invalid repository owner or name.' },
      { status: 400 }
    );
  }
  if (!isValidBranchName(newBranch)) {
    return NextResponse.json(
      { error: 'Invalid branch name.' },
      { status: 400 }
    );
  }
  if (!/^[a-f0-9]{40}$/i.test(baseSha)) {
    return NextResponse.json(
      { error: 'Invalid base commit SHA.' },
      { status: 400 }
    );
  }

  try {
    const branch = await createRepositoryBranch(
      token,
      owner,
      repo,
      newBranch,
      baseSha
    );
    return NextResponse.json({ branch }, { status: 201 });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) await clearGitHubTokenCookie();
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to create branch.' },
      { status: 500 }
    );
  }
}
