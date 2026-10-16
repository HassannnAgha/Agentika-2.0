import { NextResponse } from 'next/server';

/**
 * One login in front of everything (the wizard, the console and every API behind it).
 *
 * Why: the deployed URL is public. Without this, anyone who finds it can approve a queued action, reset the demo, or, once
 * SEND_LIVE=1, cause a real email to go out. Judges get a dedicated demo account (APP_USER / APP_PASSWORD) in the submission PDF.
 *
 *   APP_PASSWORD unset, SEND_LIVE off  -> open (local development)
 *   APP_PASSWORD unset, SEND_LIVE=1    -> refuses every request: live sending is never reachable without a login
 *   APP_PASSWORD set                   -> HTTP Basic auth
 *
 * Left open on purpose: /u/* (the unsubscribe link a recipient clicks, signed so it can only opt out their own address),
 * /a/* (the owner's one-tap decision link, signed per action so it can decide that one action and nothing else)
 * and /health (the platform's health check, returns nothing sensitive).
 */
const same = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);   // constant-time compare
  return d === 0;
};

export function proxy(request) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) {
    if (process.env.SEND_LIVE === '1') {
      return new NextResponse('Live sending is on but APP_PASSWORD is not set, so the app is locked. Set APP_PASSWORD and redeploy.', { status: 503 });
    }
    return NextResponse.next();
  }
  const user = process.env.APP_USER || 'judge';
  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(':');
      if (same(u, user) && same(rest.join(':'), pass)) return NextResponse.next();
    } catch (e) { /* malformed header: fall through to the challenge */ }
  }
  return new NextResponse('Sign in to continue.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Bizzii", charset="UTF-8"' } });
}

export const config = {
  matcher: ['/((?!u/|a/|health$|_next/static|_next/image|favicon\\.ico).*)'],
};
