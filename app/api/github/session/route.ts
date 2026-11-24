import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthenticatedUser, GitHubApiError } from '@/lib/github/client';
import {
  clearGitHubTokenCookie,
  getGitHubAccessToken,
  isGitHubOAuthConfigured,
  resolveCallbackUrl,
} from '@/lib/github/session';
import type { GitHubSessionInfo } from '@/lib/github/types';

export async function GET(request: NextRequest) {
  const configured = isGitHubOAuthConfigured();
  const callbackUrl = resolveCallbackUrl(request.nextUrl.origin);

  if (!configured) {
    const info: GitHubSessionInfo = {
      configured: false,
      connected: false,
      user: null,
      callbackUrl,
    };
    return NextResponse.json(info);
  }

  const token = await getGitHubAccessToken();
  if (!token) {
    const info: GitHubSessionInfo = {
      configured: true,
      connected: false,
      user: null,
      callbackUrl,
    };
    return NextResponse.json(info);
  }

  try {
    const user = await fetchAuthenticatedUser(token);
    const info: GitHubSessionInfo = {
      configured: true,
      connected: true,
      user,
      callbackUrl,
    };
    return NextResponse.json(info);
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 401) {
      await clearGitHubTokenCookie();
    }
    const info: GitHubSessionInfo = {
      configured: true,
      connected: false,
      user: null,
      callbackUrl,
    };
    return NextResponse.json(info);
  }
}
