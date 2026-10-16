import 'server-only';

/**
 * Reply shapes for each extraction. Gemini accepts a subset of JSON Schema
 * (type, properties, required, items, enum, description), so these stay
 * within it. Optional facts are empty strings or empty arrays, never null.
 */

const str = (description) => ({ type: 'string', description });
const strList = (description) => ({ type: 'array', items: { type: 'string' }, description });
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });

const claim = obj({
  text: str('The claim, as a short first-person-plural statement the business itself makes'),
  quote: str('The exact words in the source that support it'),
});

const person = obj({
  name: str('Full name'),
  role: str('Job title or role, empty if not stated'),
  email: str('Email address, empty if not stated'),
});

const namedClient = obj({
  name: str('The client business name'),
  website: str('The client’s website or domain, empty if not stated'),
  contact: str('A named person at the client, empty if not stated'),
  email: str('A contact email at the client, empty if not stated'),
});

export const BUSINESS_FROM_SITE = obj({
  name: str('The business name'),
  category: str('What kind of business it is, in a few words, e.g. "Design and web studio"'),
  description: str('Two sentences on what the business does and for whom, drawn from the site'),
  contact_email: str('The business’s main contact email, empty if none'),
  owner_name: str('The founder, owner or principal if the site names one, empty otherwise'),
  city: str('The city the business is based in, empty if not stated'),
  country: str('The country, empty if not stated'),
  positioning: str('How the business positions itself, two or three sentences in its own terms'),
  voice: str('A description of the writing voice the site uses: tone, person, register, what it avoids'),
  claims: { type: 'array', items: claim, description: 'Factual claims the site makes about the business, at most 8' },
  team: { type: 'array', items: person, description: 'People the site names as working at the business' },
  clients: { type: 'array', items: namedClient, description: 'Client businesses the site names in its portfolio, case studies, logos or testimonials' },
  fit: obj({
    regulated_profession: { type: 'boolean', description: 'True if the business practises medicine, dentistry, law, accounting or another licensed profession' },
    delivers_information: { type: 'boolean', description: 'True if what it delivers is information such as designs, documents, code or advice, rather than physical goods or on-site services' },
  }),
});

export const FILE_KIND = obj({
  kind: {
    type: 'string',
    enum: ['resume', 'company_document', 'other'],
    description: 'resume: a CV or professional profile of one person. company_document: a brand guide, company profile, proposal, capability deck, pitch or case study about the business. other: anything else.',
  },
  reason: str('Why, in a few words'),
});

export const RESUME = obj({
  name: str('The person’s full name'),
  email: str('Email address, empty if not stated'),
  role: str('Their most recent job title'),
  skills: strList('Distinct professional skills, at most 10, each two or three words, normalised (e.g. "React", not "React.js / ReactJS"), most relevant first'),
  years_experience: { type: 'number', description: 'Total years of professional experience, 0 if it cannot be worked out' },
  summary: str('One sentence on their experience'),
  projects: {
    type: 'array',
    description: 'Notable projects the person worked on, at most 6, most recent first: from a projects section, or specific pieces of work named in their experience',
    items: obj({
      name: str('The project, in a few words'),
      client: str('Who it was for: the client, or the employer if no client is named; empty if unclear'),
      summary: str('What the person did on it, one line'),
    }),
  },
});

export const COMPANY_DOC = obj({
  business_name: str('The business the document is about, empty if unclear'),
  category: str('What kind of business it is, in a few words, empty if not stated'),
  owner_name: str('The founder, owner or principal if named, empty otherwise'),
  owner_email: str('The founder or owner’s own email address if given, empty otherwise'),
  contact_email: str('The business’s general contact email, empty if none'),
  country: str('The country the business is based in, empty if not stated'),
  description: str('What the business does, two sentences, empty if the document does not say'),
  positioning: str('How the business positions itself, empty if not stated'),
  voice: str('Explicit voice or tone guidance if the document gives any, empty otherwise'),
  claims: { type: 'array', items: claim, description: 'Factual claims the document makes about the business, at most 8' },
  prohibited: strList('Statements the document explicitly says must not be made, empty if none'),
  clients: { type: 'array', items: namedClient, description: 'Client businesses the document names' },
  team: { type: 'array', items: person, description: 'People the document names as working at the business' },
});

export const CSV_MAPPING = obj({
  is_client_list: {
    type: 'boolean',
    description: 'True if each row names a client or customer of the business: a client list, or invoices, orders, deals, projects or contacts',
  },
  name: str('Header of the column holding the client business name, empty if none'),
  contact: str('Header of the column holding a contact person’s name, empty if none'),
  email: str('Header of the column holding an email address, empty if none'),
  first_date: str('Header of the column holding the earliest date with the client (created, first invoice, start), empty if none'),
  last_date: str('Header of the column holding the latest date with the client (last invoice, last activity, modified), empty if none'),
  status: str('Header of a column holding status or stage, empty if none'),
});
