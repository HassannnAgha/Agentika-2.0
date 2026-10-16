import 'server-only';

/**
 * Groq as the fallback for onboarding extraction, used only when Gemini cannot answer (overloaded, quota spent, down or
 * not configured). Same contract as the Gemini call: source material in, JSON matching the schema out, and nothing it
 * returns is acted on until the owner confirms it.
 *
 * Text only. Groq's chat models cannot read a PDF passed as binary, so a request that includes one is not attempted here
 * and the caller reports the original Gemini error. Websites, Word files, text and spreadsheets all work.
 *
 * Keys: GROQ_API_KEY, then GROQ_API_KEY_2, GROQ_API_KEY_3 ... tried in order when one is rate limited or rejected.
 * Models: GROQ_MODEL first if set, then gpt-oss-120b, then gpt-oss-20b. A retired model moves on to the next.
 */

const URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

export function groqKeys() {
  return Object.keys(process.env)
    .filter((k) => /^GROQ_API_KEY(_\d+)?$/.test(k) && process.env[k])
    .sort()
    .map((k) => process.env[k]);
}

/** Groq can only take text parts. */
export const textOnly = (parts) => parts.every((p) => typeof p.text === 'string');

const dead = new Set();
const models = () => [...new Set([process.env.GROQ_MODEL, ...DEFAULT_MODELS].filter(Boolean))].filter((m) => !dead.has(m));

export async function groqExtract({ parts, schema, task, system }) {
  const keys = groqKeys();
  if (!keys.length) throw new Error('no Groq key');
  const body = (model) => ({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    ...(model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
    messages: [
      { role: 'system', content: `${system}\nReply with ONE JSON object only, matching this JSON Schema exactly (omit fields the material does not state):\n${JSON.stringify(schema)}` },
      { role: 'user', content: `${parts.map((p) => p.text).join('\n\n')}\n\nTask: ${task}` },
    ],
  });

  let last = null;
  for (const model of models()) {
    for (const key of keys) {
      try {
        const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body(model)), signal: AbortSignal.timeout(45_000) });
        if (res.status === 400 || res.status === 404) { dead.add(model); last = new Error(`${model} unavailable (${res.status})`); break; } // this model is gone for every key
        if (res.status === 401 || res.status === 403 || res.status === 429) { last = new Error(`Groq key rejected or rate limited (${res.status})`); continue; } // try the next key
        if (!res.ok) { last = new Error(`Groq ${res.status}`); continue; }
        const text = (await res.json()).choices?.[0]?.message?.content;
        if (!text) { last = new Error('Groq returned no content'); continue; }
        return JSON.parse(text);
      } catch (e) {
        last = e; // timeout or bad JSON: next key, then next model
      }
    }
  }
  throw last || new Error('Groq failed');
}
