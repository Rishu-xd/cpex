import { NextResponse } from 'next/server';
import { clearGitHubTokenCookie } from '@/lib/github/session';

export async function POST() {
  await clearGitHubTokenCookie();
  return NextResponse.json({ ok: true });
}
