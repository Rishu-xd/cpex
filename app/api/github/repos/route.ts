import { NextResponse } from 'next/server';
import { GitHubApiError, listUserRepositories } from '@/lib/github/client';
import { clearGitHubTokenCookie, getGitHubAccessToken } from '@/lib/github/session';

export async function GET() {
  const token = await getGitHubAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: 'GitHub account is not connected.' },
      { status: 401 }
    );
  }

  try {
    const repos = await listUserRepositories(token);
    return NextResponse.json({ repos });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) await clearGitHubTokenCookie();
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to load repositories from GitHub.' },
      { status: 500 }
    );
  }
}
