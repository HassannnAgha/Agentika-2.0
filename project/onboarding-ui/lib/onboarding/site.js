import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import * as cheerio from 'cheerio';
import { ExtractionError } from './gemini';

/**
 * Reads a business website: the home page plus the few pages that describe
 * the business, its people, its work and its clients.
 *
 * The URL comes from a form field, so every hop is checked before it is
 * fetched: http(s) only, and never an address inside a private network. That
 * check is repeated on each redirect, since a public page can redirect inward.
 */

const MAX_PAGES = 8;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CHARS_PER_PAGE = 12_000;
const MAX_REDIRECTS = 4;

// paths worth reading, in the order they are preferred
const WANT = [
  /about|who-we-are|our-story|studio|company/i,
  /team|people|staff/i,
  /services|what-we-do|capabilities|expertise|solutions/i,
  /work|portfolio|projects|case|clients|customers/i,
  /testimonial|reviews/i,
  /contact/i,
];

function privateAddress(ip) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

async function assertPublic(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ExtractionError('Only http and https addresses can be read.', { status: 400 });
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new ExtractionError('That address is not a public website.', { status: 400 });
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new ExtractionError(`Could not find ${host}. Check the address.`, { status: 400 });
  if (addrs.some((a) => privateAddress(a.address))) {
    throw new ExtractionError('That address is not a public website.', { status: 400 });
  }
}

/** Fetch one page, following redirects by hand so each hop is checked. */
async function fetchPage(start) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // header values must be plain ASCII
      headers: { 'user-agent': "BizziiOnboarding/0.1 (reads a site at its owner's request)", accept: 'text/html' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url);
      continue;
    }
    if (!res.ok) throw new ExtractionError(`${url.href} answered ${res.status}.`);
    if (!(res.headers.get('content-type') || '').includes('html')) return null;

    // read at most MAX_BYTES
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { url, html: Buffer.concat(chunks).toString('utf8') };
  }
  throw new ExtractionError('The site redirected too many times.');
}

function toText($) {
  $('script, style, noscript, svg, iframe, form, nav, footer, header [role="navigation"]').remove();
  const parts = [];
  $('h1, h2, h3, h4, p, li, blockquote, td, address, a[href^="mailto:"]').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && t.length > 1) parts.push(t);
  });
  // keep mailto addresses, which are often only in hrefs
  $('a[href^="mailto:"]').each((_, el) => parts.push($(el).attr('href').replace(/^mailto:/, '').split('?')[0]));
  return [...new Set(parts)].join('\n').slice(0, MAX_CHARS_PER_PAGE);
}

function pickLinks($, base) {
  const found = new Map();
  $('a[href]').each((_, el) => {
    let u;
    try {
      u = new URL($(el).attr('href'), base);
    } catch {
      return;
    }
    if (u.hostname !== base.hostname) return;
    u.hash = '';
    u.search = '';
    const path = u.pathname;
    if (path === '/' || /\.(pdf|jpe?g|png|gif|zip|docx?)$/i.test(path)) return;
    const rank = WANT.findIndex((re) => re.test(path) || re.test($(el).text()));
    if (rank === -1) return;
    if (!found.has(u.href) || found.get(u.href) > rank) found.set(u.href, rank);
  });
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(([href]) => new URL(href));
}

/** Returns [{ url, title, text }] for up to MAX_PAGES pages of the site. */
export async function readSite(input) {
  const raw = input.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new ExtractionError('Only http and https addresses can be read.', { status: 400 });
  }
  let start;
  try {
    start = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new ExtractionError('That is not a web address.', { status: 400 });
  }

  const home = await fetchPage(start);
  if (!home) throw new ExtractionError('That address did not return a web page.', { status: 400 });

  const $home = cheerio.load(home.html);
  const links = pickLinks($home, home.url).slice(0, MAX_PAGES - 1);
  const pages = [{ url: home.url.href, title: $home('title').text().trim(), text: toText($home) }];

  const rest = await Promise.allSettled(links.map((u) => fetchPage(u)));
  for (const r of rest) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const $ = cheerio.load(r.value.html);
    pages.push({ url: r.value.url.href, title: $('title').text().trim(), text: toText($) });
  }

  const readable = pages.filter((p) => p.text.length > 200);
  if (!readable.length) {
    throw new ExtractionError(
      'This site shows no readable text without running scripts, so it could not be read. Upload a company profile or brochure instead, or fill the screens in by hand.',
      { status: 422 },
    );
  }
  return readable;
}
