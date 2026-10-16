import { extractJSON, ExtractionError } from '../../../../lib/onboarding/gemini';
import { BUSINESS_FROM_SITE } from '../../../../lib/onboarding/schemas';
import { readSite } from '../../../../lib/onboarding/site';

/** POST { url } -> what the business's own website says about it. */
export async function POST(request) {
  try {
    const { url } = await request.json().catch(() => ({}));
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'Give the address of the business website.' }, { status: 400 });
    }

    const pages = await readSite(url);
    const site = pages.map((p) => `=== PAGE ${p.url} (${p.title}) ===\n${p.text}`).join('\n\n');

    const out = await extractJSON({
      parts: [{ text: `The website of the business, page by page:\n\n${site}` }],
      schema: BUSINESS_FROM_SITE,
      task:
        'Extract the business profile, its brand voice and positioning, the factual claims it makes about itself, ' +
        'the people it names as working there, and the client businesses it names. For each claim, quote the exact supporting words.',
    });

    return Response.json({ ...out, pages: pages.map((p) => ({ url: p.url, title: p.title })) });
  } catch (e) {
    if (e instanceof ExtractionError) return Response.json({ error: e.message }, { status: e.status });
    console.error('website import failed', e);
    return Response.json({ error: 'The website could not be read.' }, { status: 500 });
  }
}
