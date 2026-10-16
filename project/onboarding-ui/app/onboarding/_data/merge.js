/**
 * Folds one import result into the onboarding record.
 *
 * Three rules, in order of importance:
 *   1. Never overwrite what the owner typed or confirmed. Imports only fill
 *      empty fields and add rows.
 *   2. The same person or client found in two sources is one record: match on
 *      email (or email domain for clients), then on normalised name.
 *   3. Everything imported arrives unconfirmed, labelled with its source.
 */

export function nextId(prefix, rows) {
  const n = rows.reduce((m, r) => Math.max(m, Number(String(r.id).split('-')[1]) || 0), 0);
  return `${prefix}-${n + 1}`;
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b(the|ltd|limited|llc|inc|co|company|pvt|private|plc|gmbh)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '');

const domainOf = (s) => {
  const v = String(s || '').toLowerCase().trim();
  if (!v) return '';
  if (v.includes('@')) return v.split('@')[1];
  try {
    return new URL(/^https?:/.test(v) ? v : `https://${v}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// generic mail providers say nothing about which business a contact belongs to
const FREE_MAIL = /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|proton|protonmail|aol|ymail)\./;

const TZ_BY_COUNTRY = {
  pakistan: 'Asia/Karachi',
  'united arab emirates': 'Asia/Dubai',
  uae: 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  england: 'Europe/London',
  germany: 'Europe/Berlin',
  'united states': 'America/New_York',
  usa: 'America/New_York',
  australia: 'Australia/Sydney',
};

/* ---------- scalars ------------------------------------------------------ */

// fields that start with a default rather than empty; an import may replace
// the default as long as nobody has touched it
const DEFAULTED = new Set(['business.timezone']);

function fill(p, path, value, source) {
  const v = typeof value === 'string' ? value.trim() : value;
  if (!v) return p;
  const [section, field] = path.split('.');
  const filled = String(p[section][field] || '').trim() !== '';
  // an owner edit always writes provenance, so no entry means nobody touched it
  const untouchedDefault = DEFAULTED.has(path) && !p.provenance[path];
  // owner-typed or an earlier import: keep it (the first source wins)
  if (filled && !untouchedDefault) return p;
  return {
    ...p,
    [section]: { ...p[section], [field]: v },
    provenance: { ...p.provenance, [path]: { source, confirmed: false } },
  };
}

/* ---------- rows --------------------------------------------------------- */

function mergePerson(p, person, source) {
  const name = String(person.name || '').trim();
  if (!name) return p;
  const email = String(person.email || '').trim().toLowerCase();
  const idx = p.team.findIndex(
    (m) => (email && m.email.toLowerCase() === email) || norm(m.name) === norm(name),
  );

  const incoming = {
    name,
    role: String(person.role || '').trim(),
    email,
    skills: Array.isArray(person.skills) ? person.skills.filter(Boolean) : [],
    experience: person.years_experience ? Math.round(person.years_experience) : '',
    summary: String(person.summary || '').trim(),
  };

  const addProjects = (have) => {
    const out = [...have];
    for (const pr of person.projects || []) {
      const name = String(pr.name || '').trim();
      if (!name || out.some((x) => norm(x.name) === norm(name))) continue;
      out.push({ id: nextId('pj', out), name, client: String(pr.client || '').trim(), summary: String(pr.summary || '').trim() });
    }
    return out;
  };

  if (idx === -1) {
    const row = { id: nextId('tm', p.team), capacity: 40, ...incoming, projects: addProjects([]), custom: [], source, confirmed: false };
    return { ...p, team: [...p.team, row] };
  }

  const cur = p.team[idx];
  const projects = addProjects(cur.projects || []);
  const merged = {
    ...cur,
    projects,
    custom: cur.custom || [],
    role: cur.role || incoming.role,
    email: cur.email || incoming.email,
    experience: cur.experience || incoming.experience,
    summary: cur.summary || incoming.summary,
    skills: [...new Set([...cur.skills, ...incoming.skills])].slice(0, 12),
    source: cur.source && cur.source !== source ? `${cur.source} + ${source}` : cur.source || source,
    // new information on a confirmed row needs looking at again
    confirmed: cur.confirmed && incoming.skills.every((s) => cur.skills.includes(s)) && projects.length === (cur.projects || []).length,
  };
  return { ...p, team: p.team.map((m, i) => (i === idx ? merged : m)) };
}

function mergeClient(p, c, source) {
  const name = String(c.name || '').trim();
  if (!name) return p;
  const email = String(c.email || '').trim().toLowerCase();
  const domain = domainOf(email) || domainOf(c.website);
  const useDomain = domain && !FREE_MAIL.test(domain);

  const idx = p.clients.findIndex(
    (x) => (useDomain && domainOf(x.email) === domain) || norm(x.name) === norm(name),
  );

  const incoming = {
    name,
    contact: String(c.contact || '').trim(),
    email,
    since: c.since || '',
    last_contact: c.last_contact || '',
    status: c.status || 'active',
  };

  if (idx === -1) {
    const row = { id: nextId('cl', p.clients), ...incoming, custom: [], source, confirmed: false };
    return { ...p, clients: [...p.clients, row] };
  }

  const cur = p.clients[idx];
  const earliest = [cur.since, incoming.since].filter(Boolean).sort()[0] || '';
  const latest = [cur.last_contact, incoming.last_contact].filter(Boolean).sort().pop() || '';
  const merged = {
    ...cur,
    contact: cur.contact || incoming.contact,
    email: cur.email || incoming.email,
    since: earliest,
    last_contact: latest,
    // a spreadsheet status is better evidence than a portfolio mention
    status: c.status && source.endsWith('.csv') ? c.status : cur.status,
    source: cur.source && cur.source !== source ? `${cur.source} + ${source}` : cur.source || source,
    confirmed: cur.confirmed && earliest === cur.since && latest === cur.last_contact,
  };
  return { ...p, clients: p.clients.map((x, i) => (i === idx ? merged : x)) };
}

function mergeClaims(p, list, key, source) {
  const have = new Set(p.brand[key].map((c) => norm(c.text)));
  const add = [];
  for (const item of list || []) {
    const text = String(typeof item === 'string' ? item : item.text || '').trim();
    if (!text || have.has(norm(text))) continue;
    have.add(norm(text));
    add.push({
      id: nextId(key === 'permitted' ? 'pc' : 'xc', [...p.brand[key], ...add]),
      text,
      quote: typeof item === 'string' ? '' : String(item.quote || '').trim(),
      source,
      confirmed: false,
    });
  }
  return add.length ? { ...p, brand: { ...p.brand, [key]: [...p.brand[key], ...add] } } : p;
}

/* ---------- entry points ------------------------------------------------- */

export function mergeWebsite(p, site) {
  const host = domainOf(site.pages?.[0]?.url) || 'website';
  const src = `website · ${host}`;
  let q = p;
  q = fill(q, 'business.name', site.name, src);
  q = fill(q, 'business.category', site.category, src);
  q = fill(q, 'business.description', site.description, src);
  q = fill(q, 'business.owner_name', site.owner_name, src);
  q = fill(q, 'business.owner_email', site.contact_email, src);
  q = fill(q, 'business.timezone', TZ_BY_COUNTRY[String(site.country || '').toLowerCase().trim()], src);
  q = fill(q, 'brand.positioning', site.positioning, src);
  q = fill(q, 'brand.voice', site.voice, src);
  q = mergeClaims(q, site.claims, 'permitted', src);
  for (const person of site.team || []) q = mergePerson(q, person, src);
  for (const c of site.clients || []) q = mergeClient(q, c, src);
  return q;
}

export function mergeFileResult(p, r) {
  const src = r.name;
  if (r.kind === 'resume') return mergePerson(p, r.resume, src);
  if (r.kind === 'client_list') return r.clients.reduce((q, c) => mergeClient(q, c, src), p);
  if (r.kind === 'company_document') {
    const d = r.doc;
    let q = p;
    q = fill(q, 'business.name', d.business_name, src);
    q = fill(q, 'business.category', d.category, src);
    q = fill(q, 'business.description', d.description, src);
    q = fill(q, 'business.owner_name', d.owner_name, src);
    // the approver is a person: their own address before the general inbox
    q = fill(q, 'business.owner_email', d.owner_email || d.contact_email, src);
    q = fill(q, 'business.timezone', TZ_BY_COUNTRY[String(d.country || '').toLowerCase().trim()], src);
    q = fill(q, 'brand.positioning', d.positioning, src);
    q = fill(q, 'brand.voice', d.voice, src);
    q = mergeClaims(q, d.claims, 'permitted', src);
    q = mergeClaims(q, d.prohibited, 'prohibited', src);
    for (const person of d.team || []) q = mergePerson(q, person, src);
    for (const c of d.clients || []) q = mergeClient(q, c, src);
    return q;
  }
  return p;
}
