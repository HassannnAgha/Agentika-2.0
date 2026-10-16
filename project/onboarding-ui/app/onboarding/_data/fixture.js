/**
 * Onboarding answers -> fixture bundle.
 *
 * The final step emits this so that one artifact configures both the product
 * and the simulator (plan B1). scripts/seed_from_onboarding.py normalises it
 * and bizzii.sim reads the result.
 *
 * The shape follows the contents list in fixtures/README.md: business
 * profile, team, clients, brand material, correspondence. acme-studio.json is
 * not in the repository yet, so if its shape lands differently, this function
 * is the one place to change.
 */

import { AGENTS } from './catalogue';

export const FIXTURE_VERSION = 2;

// MEM-2 provenance: who put a record here, and from what
const origin = (row) => ({ origin: row.source ? 'extracted' : 'owner', source: row.source || null });

// owner-added fields, empty rows dropped
const custom = (rows) =>
  (rows || []).filter((r) => r.label.trim() && r.value.trim()).map((r) => ({ label: r.label.trim(), value: r.value.trim() }));

export function agentStatus(connections) {
  const out = {};
  for (const [key, a] of Object.entries(AGENTS)) {
    const missing = a.needs.filter((c) => connections[c].status !== 'connected');
    out[key] = { active: missing.length === 0, missing };
  }
  return out;
}

export function buildFixture(p) {
  const b = p.business;

  return {
    fixture_version: FIXTURE_VERSION,
    source: 'onboarding',

    business: {
      name: b.name,
      category: b.category,
      description: b.description,
      team_size: Number(p.fit.team_size),
      timezone: b.timezone,
      working_days: b.working_days,
      working_hours: { start: b.hours_start, end: b.hours_end },
      // the single approver (Theorem 5.2); every owner-routed action goes here
      owner: { name: b.owner_name, email: b.owner_email },
      custom: custom(b.custom),
    },

    fit_check: { ...p.fit, team_size: Number(p.fit.team_size) },

    // the sources the owner supplied; files themselves are not kept
    sources: {
      website: p.imports.website?.status === 'done' ? p.imports.website.url : null,
      files: p.imports.files.filter((f) => f.status === 'done').map((f) => ({ name: f.name, kind: f.kind })),
    },

    team: p.team.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      skills: m.skills,
      years_experience: m.experience === '' || m.experience == null ? null : Number(m.experience),
      weekly_capacity_hours: Number(m.capacity),
      previous_projects: (m.projects || [])
        .filter((pr) => pr.name.trim())
        .map((pr) => ({ name: pr.name.trim(), client: pr.client.trim() || null, summary: pr.summary.trim() || null })),
      custom: custom(m.custom),
      ...origin(m),
    })),

    // status decides the target component t: client, prospect, or a past client
    clients: p.clients.map((c) => ({
      id: c.id,
      name: c.name,
      contact: { name: c.contact, email: c.email },
      relationship_start: c.since,
      status: c.status,
      last_contact: c.last_contact,
      custom: custom(c.custom),
      ...origin(c),
    })),

    brand: {
      voice: p.brand.voice,
      positioning: p.brand.positioning,
      permitted_claims: p.brand.permitted
        .filter((c) => c.text.trim())
        .map((c) => ({ text: c.text.trim(), supporting_quote: c.quote || null, ...origin(c) })),
      prohibited_claims: p.brand.prohibited.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), ...origin(c) })),
      custom: custom(p.brand.custom),
    },

    // where each imported business and brand field came from; absent means typed by the owner
    provenance: Object.fromEntries(
      Object.entries(p.provenance)
        .filter(([, v]) => v.source)
        .map(([k, v]) => [k, { origin: 'extracted', source: v.source }]),
    ),

    // simulated: the keys are fakes minted by the consent panel
    connections: Object.fromEntries(
      Object.entries(p.connections).map(([k, v]) => [k, { status: v.status, simulated: true, key: v.key }]),
    ),

    agents: agentStatus(p.connections),

    // clients the owner chose to take up on the review screen
    take_up: p.take_up,

    // nothing is ingested during onboarding
    correspondence: [],
  };
}
