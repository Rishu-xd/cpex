import 'server-only';

import { cookies } from 'next/headers';
import { decryptSecret, encryptSecret } from './crypto';

const TOKEN_COOKIE_NAME = 'cpex_gh_session';
const STATE_COOKIE_NAME = 'cpex_gh_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes

export function getGitHubOAuthCredentials(): {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
} {
  const clientId = (process.env.GITHUB_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET ?? '').trim();
  const sessionSecret = (
    process.env.GITHUB_SESSION_SECRET ||
    `cpex-derived:${clientId}:${clientSecret}`
  ).trim();

  return { clientId, clientSecret, sessionSecret };
}

export function isGitHubOAuthConfigured(): boolean {
  const { clientId, clientSecret } = getGitHubOAuthCredentials();
  return clientId.length > 0 && clientSecret.length > 0;
}

export function resolveCallbackUrl(requestOrigin?: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? requestOrigin ?? 'http://localhost:3000').replace(
    /\/+$/,
    ''
  );
  return `${base}/api/github/callback`;
}

export async function setOAuthStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: STATE_MAX_AGE_SECONDS,
  });
}

export async function consumeOAuthStateCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(STATE_COOKIE_NAME)?.value ?? null;
  cookieStore.delete(STATE_COOKIE_NAME);
  return val;
}

export async function setGitHubTokenCookie(accessToken: string): Promise<void> {
  const { sessionSecret } = getGitHubOAuthCredentials();
  const sealed = encryptSecret(accessToken, sessionSecret);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, sealed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getGitHubAccessToken(): Promise<string | null> {
  if (!isGitHubOAuthConfigured()) return null;
  const { sessionSecret } = getGitHubOAuthCredentials();
  const cookieStore = await cookies();
  const raw = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decryptSecret(raw, sessionSecret);
}

export async function clearGitHubTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}
