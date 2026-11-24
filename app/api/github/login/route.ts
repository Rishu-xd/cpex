import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState } from '@/lib/github/crypto';
import {
  getGitHubOAuthCredentials,
  isGitHubOAuthConfigured,
  resolveCallbackUrl,
  setOAuthStateCookie,
} from '@/lib/github/session';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!isGitHubOAuthConfigured()) {
    return NextResponse.redirect(
      new URL('/playground?github=error&reason=not_configured', origin)
    );
  }

  const state = generateOAuthState();
  await setOAuthStateCookie(state);

  const { clientId } = getGitHubOAuthCredentials();
  const redirectUri = resolveCallbackUrl(origin);

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'repo read:user');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl);
}
