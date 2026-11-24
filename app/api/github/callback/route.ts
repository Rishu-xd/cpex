import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthenticatedUser } from '@/lib/github/client';
import { safeCompare } from '@/lib/github/crypto';
import {
  consumeOAuthStateCookie,
  getGitHubOAuthCredentials,
  isGitHubOAuthConfigured,
  resolveCallbackUrl,
  setGitHubTokenCookie,
} from '@/lib/github/session';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!isGitHubOAuthConfigured()) {
    return NextResponse.redirect(
      new URL('/playground?github=error&reason=not_configured', origin)
    );
  }

  const errorParam = request.nextUrl.searchParams.get('error');
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/playground?github=error&reason=${encodeURIComponent(errorParam)}`, origin)
    );
  }

  const code = request.nextUrl.searchParams.get('code') ?? '';
  const state = request.nextUrl.searchParams.get('state') ?? '';
  const expectedState = await consumeOAuthStateCookie();

  if (!code || !state || !expectedState || !safeCompare(state, expectedState)) {
    return NextResponse.redirect(
      new URL('/playground?github=error&reason=invalid_state', origin)
    );
  }

  try {
    const { clientId, clientSecret } = getGitHubOAuthCredentials();
    const redirectUri = resolveCallbackUrl(origin);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL('/playground?github=error&reason=token_exchange_failed', origin)
      );
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL(
          `/playground?github=error&reason=${encodeURIComponent(tokenData.error ?? 'missing_token')}`,
          origin
        )
      );
    }

    await fetchAuthenticatedUser(tokenData.access_token);
    await setGitHubTokenCookie(tokenData.access_token);

    return NextResponse.redirect(new URL('/playground?github=connected', origin));
  } catch {
    return NextResponse.redirect(
      new URL('/playground?github=error&reason=oauth_failed', origin)
    );
  }
}
