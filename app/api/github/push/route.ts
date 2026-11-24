import { NextRequest, NextResponse } from 'next/server';
import { GitHubApiError, pushRepositoryFile } from '@/lib/github/client';
import { clearGitHubTokenCookie, getGitHubAccessToken } from '@/lib/github/session';
import { validatePushPayload } from '@/lib/github/validation';

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

  const validated = validatePushPayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const result = await pushRepositoryFile(token, validated.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) await clearGitHubTokenCookie();
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Failed to push commit to GitHub.' },
      { status: 500 }
    );
  }
}
