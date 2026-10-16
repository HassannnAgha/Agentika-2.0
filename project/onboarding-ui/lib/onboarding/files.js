import 'server-only';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import { extractText, getDocumentProxy } from 'unpdf';
import { extractJSON, ExtractionError } from './gemini';
import { COMPANY_DOC, CSV_MAPPING, FILE_KIND, RESUME } from './schemas';

/**
 * Turns one uploaded file into onboarding records.
 *
 * PDFs with a text layer (almost every CV and company profile) are reduced to text first, so they can be read by Gemini or,
 * when Gemini is busy or out of quota, by the Groq fallback. Only a scanned PDF with no text goes to Gemini as the file
 * itself, since only Gemini can read the page images. Word files are reduced to text first. Spreadsheets cost one call however
 * long they are: Gemini only names the columns, and the rows are read here.
 * Nothing is written to disk.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 20;

/*
 * Documents are read in batches, one Gemini request for several files. The
 * free tier allows about twenty requests a day per model, so a request per
 * file would spend half a day's quota on one onboarding.
 */
const BATCH_FILES = 8;
const BATCH_BYTES = 12 * 1024 * 1024; // inline data must stay under Gemini's 20 MB request cap

const BATCH_SCHEMA = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The file name exactly as given in the FILE marker' },
          kind: FILE_KIND.properties.kind,
          resume: RESUME,
          company_document: COMPANY_DOC,
        },
        required: ['name', 'kind'],
      },
    },
  },
  required: ['files'],
};

const TASK =
  'Each file is introduced by a line "=== FILE: <name> ===". Return one entry per file, in the same order, with its exact name. ' +
  'For a resume, fill "resume" and omit "company_document". ' +
  'For a document about a business (brand guide, company profile, proposal, capability deck, case study), fill "company_document" and omit "resume". ' +
  'Otherwise set kind to "other" and fill neither. Never mix information between files.';

function typeOf(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.csv') || file.type === 'text/csv') return 'csv';
  if (name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  return null;
}

/** The Gemini parts for one document, introduced by its name. */
async function partsFor(file, kind) {
  const buf = Buffer.from(await file.arrayBuffer());
  const marker = { text: `=== FILE: ${file.name} ===` };
  if (kind === 'pdf') {
    const text = await pdfText(buf);
    if (text.trim().length >= 120) return { parts: [marker, { text: text.slice(0, 60_000) }], bytes: Math.min(text.length, 60_000) };
    return { parts: [marker, { inlineData: { mimeType: 'application/pdf', data: buf.toString('base64') } }], bytes: buf.length }; // scanned: Gemini only
  }
  const text = kind === 'docx' ? (await mammoth.extractRawText({ buffer: buf })).value : buf.toString('utf8');
  if (text.trim().length < 40) throw new ExtractionError('The file has almost no readable text.', { status: 422 });
  const body = text.slice(0, 60_000);
  return { parts: [marker, { text: body }], bytes: body.length };
}

/** The PDF's text layer, or '' for a scanned PDF (or one that cannot be opened). */
async function pdfText(buf) {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text || '');
  } catch {
    return '';
  }
}

function toResult(entry) {
  if (entry?.kind === 'resume' && entry.resume) return { kind: 'resume', resume: entry.resume };
  if (entry?.kind === 'company_document' && entry.company_document) return { kind: 'company_document', doc: entry.company_document };
  return { kind: 'other' };
}

/** name -> result or Error, for a set of documents (PDF, Word, text). */
async function readDocuments(docs) {
  const out = new Map();
  const prepared = [];
  for (const { file, kind } of docs) {
    try {
      prepared.push({ file, ...(await partsFor(file, kind)) });
    } catch (e) {
      out.set(file.name, e);
    }
  }

  const batches = [];
  for (const d of prepared) {
    const last = batches.at(-1);
    if (last && last.length < BATCH_FILES && last.bytes + d.bytes <= BATCH_BYTES) {
      last.push(d);
      last.bytes += d.bytes;
    } else {
      batches.push(Object.assign([d], { bytes: d.bytes }));
    }
  }

  await Promise.all(
    batches.map(async (batch) => {
      const missed = [];
      try {
        const res = await extractJSON({ parts: batch.flatMap((d) => d.parts), schema: BATCH_SCHEMA, task: TASK });
        const entries = res.files || [];
        batch.forEach((d, i) => {
          // match by name, falling back to position when the model shortens a name
          const entry = entries.find((x) => x.name === d.file.name) ?? (entries.length === batch.length ? entries[i] : null);
          if (entry) out.set(d.file.name, toResult(entry));
          else missed.push(d);
        });
      } catch (e) {
        if (batch.length === 1) out.set(batch[0].file.name, e);
        else missed.push(...batch);
      }
      // anything the batch did not account for is read again on its own (smaller requests succeed where a batch did not)
      for (const d of missed) {
        try {
          const res = await extractJSON({ parts: d.parts, schema: BATCH_SCHEMA, task: TASK });
          const entry = (res.files || [])[0];
          out.set(d.file.name, entry ? toResult(entry) : new ExtractionError('This file could not be read.'));
        } catch (e) {
          out.set(d.file.name, e);
        }
      }
    }),
  );
  return out;
}

/* ---------- spreadsheets ------------------------------------------------- */

const pad = (n) => String(n).padStart(2, '0');

/** Best effort to an ISO date. Day-first when ambiguous, as in Pakistan and the UK. */
export function toISODate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m.map(Number);
    if (y < 100) y += 2000;
    const [d, mo] = b > 12 ? [b, a] : [a, b];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Relationship status from a status column when it states one. Values that
 * describe something else, such as an invoice being paid or sent, fall back
 * to the dates: nothing in the past year makes a client past.
 */
function statusFrom(value, lastDate) {
  const v = String(value || '').toLowerCase();
  if (/lead|prospect|opportunit|qualif|proposal|pipeline/.test(v)) return 'prospect';
  if (/inactive|past|former|churn|closed|lost|archiv|ended/.test(v)) return 'past';
  if (/^(active|current|ongoing|live|retained|customer|client)$/.test(v.trim())) return 'active';
  if (lastDate) {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    if (new Date(lastDate) < yearAgo) return 'past';
  }
  return 'active';
}

async function readSpreadsheet(file) {
  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
  const headers = parsed.meta.fields?.filter(Boolean) || [];
  if (!headers.length || !parsed.data.length) throw new ExtractionError('The spreadsheet has no header row or no rows.', { status: 422 });

  const sample = Papa.unparse({ fields: headers, data: parsed.data.slice(0, 5) });
  const map = await extractJSON({
    parts: [{ text: `Spreadsheet "${file.name}", header and first rows:\n\n${sample}` }],
    schema: CSV_MAPPING,
    task:
      'Say whether these rows are about the business’s clients: a client or customer list, or records that name a client on each row, ' +
      'such as invoices, orders, deals, projects or contacts. Then name the column that holds each field, using the exact header text.',
  });
  if (!map.is_client_list || !headers.includes(map.name)) {
    return { kind: 'other', note: 'No column of client names was found, so this does not look like a client list.' };
  }

  // one row per client: invoice and activity exports repeat the same client
  const byName = new Map();
  for (const row of parsed.data) {
    const name = String(row[map.name] || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const first = toISODate(row[map.first_date]);
    const last = toISODate(row[map.last_date]) || first;
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, {
        name,
        contact: String(row[map.contact] || '').trim(),
        email: String(row[map.email] || '').trim(),
        since: first,
        last_contact: last,
        statusRaw: row[map.status],
      });
    } else {
      prev.contact ||= String(row[map.contact] || '').trim();
      prev.email ||= String(row[map.email] || '').trim();
      if (first && (!prev.since || first < prev.since)) prev.since = first;
      if (last && (!prev.last_contact || last >= prev.last_contact)) {
        prev.last_contact = last;
        prev.statusRaw = row[map.status]; // the latest row says where things stand
      }
    }
  }

  const clients = [...byName.values()].map(({ statusRaw, ...c }) => ({ ...c, status: statusFrom(statusRaw, c.last_contact) }));
  return { kind: 'client_list', clients, rows: parsed.data.length };
}

/* ---------- entry point -------------------------------------------------- */

/** One result per file, in the order given: { name, ok, ... } or { name, ok: false, error }. */
export async function readFiles(files) {
  const found = new Map();
  const docs = [];
  const sheets = [];

  for (const file of files) {
    const kind = typeOf(file);
    if (file.size > MAX_FILE_BYTES) found.set(file.name, new ExtractionError('Larger than 10 MB.', { status: 413 }));
    else if (!kind) found.set(file.name, new ExtractionError('Not a PDF, Word (.docx), CSV or text file.', { status: 415 }));
    else if (kind === 'csv') sheets.push(file);
    else docs.push({ file, kind });
  }

  const [docResults] = await Promise.all([
    readDocuments(docs),
    ...sheets.map(async (f) => {
      try {
        found.set(f.name, await readSpreadsheet(f));
      } catch (e) {
        found.set(f.name, e);
      }
    }),
  ]);
  for (const [name, r] of docResults) found.set(name, r);

  return files.map((f) => {
    const r = found.get(f.name);
    if (r instanceof Error) {
      if (!(r instanceof ExtractionError)) console.error('file import failed', f.name, r);
      return { name: f.name, ok: false, error: r instanceof ExtractionError ? r.message : 'Could not be read.' };
    }
    return { name: f.name, ok: true, ...r };
  });
}
