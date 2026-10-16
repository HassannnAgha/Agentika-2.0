/**
 * The onboarding record and the constants the wizard is built from.
 *
 * The record starts empty. It is filled by import (website, documents,
 * resumes, client spreadsheet) and by the owner. Every imported value carries
 * where it came from and whether the owner has confirmed it, because what is
 * recorded here is taken as true by every agent (§4.5) and its origin is kept
 * as provenance (MEM-2).
 *
 *   scalar fields   provenance['business.description'] = { source, confirmed }
 *   list rows       row.source (null when the owner typed it) and row.confirmed
 */

export const STEPS = [
  { slug: '', label: 'Fit' },
  { slug: 'import', label: 'Import' },
  { slug: 'business', label: 'Business' },
  { slug: 'team', label: 'Team' },
  { slug: 'clients', label: 'Clients' },
  { slug: 'brand', label: 'Brand' },
  { slug: 'services', label: 'Connect' },
  { slug: 'review', label: 'Review' },
];

export const stepHref = (i) => (STEPS[i].slug ? `/onboarding/${STEPS[i].slug}` : '/onboarding');

/** Screen 0. Each condition is one the design depends on (§4.5, Kind of Business). */
export const FIT_QUESTIONS = [
  {
    key: 'agreed_in_writing',
    q: 'Does work arrive and get agreed in writing?',
    why: 'The agents read correspondence to learn what was agreed. Work settled by phone or in person leaves nothing for them to read, so every proposal would rest on facts the system does not hold.',
  },
  {
    key: 'project_based',
    q: 'Is work organised as projects with a scope and an end?',
    why: 'The Project Management Agent breaks a confirmed project into subtasks. Open-ended retainers or walk-in work give it nothing to break down.',
  },
  {
    key: 'repeat_named_clients',
    q: 'Are clients named businesses you deal with more than once?',
    why: 'Who a message is addressed to is decided by the client list. One-off or anonymous customers cannot be told apart from strangers, so every message to them would be held for you.',
  },
  {
    key: 'delivers_information',
    q: 'Is what you deliver information, such as designs, documents, code or advice?',
    why: 'The agents can only act through email and a task tool. Physical goods and on-site services need steps they cannot see or take.',
  },
  {
    key: 'not_regulated',
    q: 'Is the business outside a regulated profession such as medicine, law or accounting?',
    why: 'Regulated advice carries duties a proposal cannot discharge. A dental clinic or a law firm needs a professional to sign every client communication, which leaves nothing an agent could earn.',
  },
];

export const TEAM_MIN = 3;
export const TEAM_MAX = 8;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TIMEZONES = ['Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];

export const CLIENT_STATUSES = ['active', 'past', 'prospect'];

/** Offered on the brand screen; the owner ticks the ones that apply. */
export const COMMON_PROHIBITED = [
  'Any guarantee of results, rankings, traffic or revenue.',
  'Any price not already quoted in writing to that client.',
  'Naming a client who has not agreed to be named.',
  'Any delivery date not already agreed with that client.',
];

export function emptyProfile() {
  return {
    fit: {
      agreed_in_writing: null,
      project_based: null,
      repeat_named_clients: null,
      delivers_information: null,
      not_regulated: null,
      team_size: '',
    },

    business: {
      name: '',
      category: '',
      description: '',
      timezone: 'Asia/Karachi',
      working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      hours_start: '09:00',
      hours_end: '18:00',
      owner_name: '',
      owner_email: '',
      custom: [], // { id, label, value }: anything the fields above do not cover
    },

    // rows also carry custom: [] like business; team rows carry projects: [{ id, name, client, summary }]
    team: [],
    clients: [],

    brand: {
      voice: '',
      positioning: '',
      permitted: [], // { id, text, quote, source, confirmed }
      prohibited: [], // { id, text, source, confirmed }
      custom: [],
    },

    provenance: {},

    connections: {
      email: { status: 'pending', key: null },
      task_tool: { status: 'pending', key: null },
    },

    take_up: [],

    // progress of each import, shown on the import screen
    imports: { website: null, files: [] },
  };
}

/* ---------- confirmation ------------------------------------------------- */

/** Scalar fields that belong to each screen, for counting what is unconfirmed. */
export const SCREEN_FIELDS = {
  business: ['business.name', 'business.category', 'business.description', 'business.timezone', 'business.owner_name', 'business.owner_email'],
  brand: ['brand.voice', 'brand.positioning'],
};

const rowsOf = (p, screen) =>
  screen === 'team' ? p.team
    : screen === 'clients' ? p.clients
      : screen === 'brand' ? [...p.brand.permitted, ...p.brand.prohibited]
        : [];

export function unconfirmedCount(p, screen) {
  const fields = (SCREEN_FIELDS[screen] || []).filter((k) => p.provenance[k] && !p.provenance[k].confirmed).length;
  return fields + rowsOf(p, screen).filter((r) => !r.confirmed).length;
}

/** Marks every imported value on one screen as confirmed by the owner. */
export function confirmScreen(p, screen) {
  const provenance = { ...p.provenance };
  for (const k of SCREEN_FIELDS[screen] || []) if (provenance[k]) provenance[k] = { ...provenance[k], confirmed: true };
  const ok = (rows) => rows.map((r) => ({ ...r, confirmed: true }));
  return {
    ...p,
    provenance,
    team: screen === 'team' ? ok(p.team) : p.team,
    clients: screen === 'clients' ? ok(p.clients) : p.clients,
    brand: screen === 'brand' ? { ...p.brand, permitted: ok(p.brand.permitted), prohibited: ok(p.brand.prohibited) } : p.brand,
  };
}
