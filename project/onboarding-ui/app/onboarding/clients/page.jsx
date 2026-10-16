'use client';

import Link from 'next/link';
import Frame, { SourceChip } from '../../../components/onboarding/Frame';
import { CustomFields, DropZone } from '../../../components/onboarding/fields';
import { useImporter } from '../../../components/onboarding/importer';
import { nextId, useOnboarding } from '../../../components/onboarding/state';
import { CLIENT_STATUSES } from '../_data/profile';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_NOTE = {
  active: 'Treated as a client',
  past: 'Treated as a client; no current work',
  prospect: 'Treated as a prospect until they become a client',
};

export default function Clients() {
  const { profile, update } = useOnboarding();
  const clients = profile.clients;

  const { importFiles } = useImporter();
  // editing a row is the owner vouching for it
  const setRow = (id, patch) =>
    update('clients', clients.map((c) => (c.id === id ? { ...c, ...patch, confirmed: true } : c)));
  const add = () =>
    update('clients', [
      ...clients,
      { id: nextId('cl', clients), name: '', contact: '', email: '', since: '', status: 'active', last_contact: '', custom: [], source: null, confirmed: true },
    ]);
  const remove = (id) => {
    update('clients', clients.filter((c) => c.id !== id));
    update('take_up', profile.take_up.filter((x) => x !== id));
  };

  let blocked = null;
  if (!clients.length) blocked = 'Record at least one client — with none, no action can be addressed';
  else if (clients.some((c) => !c.name.trim())) blocked = 'Every client needs a business name';
  else if (clients.some((c) => !EMAIL.test(c.email))) blocked = 'Every client needs a valid contact email';

  const counts = CLIENT_STATUSES.map((s) => `${clients.filter((c) => c.status === s).length} ${s}`).join(' · ');

  return (
    <Frame
      step={4}
      screen="clients"
      wide
      title="Who are your clients?"
      lede="The most important screen in the setup. Whether the person an agent writes to is a teammate, a client, a prospect or a stranger is decided only by whether they appear here, and with what status."
      readBy={[
        { field: 'Status', by: 'the gate, which sets the target of every action: client, prospect or unknown' },
        { field: 'Contact email', by: 'the guardrail — an agent may write only to an address already on record' },
        { field: 'Business name and contact', by: 'the facts an agent may cite about this counterparty' },
        { field: 'Relationship start, last contact', by: 'Operations Agent, to judge silence against the relationship' },
      ]}
      blocked={blocked}
      art={{ variant: 'peak', tone: 'warm' }}
      anno={{
        fig: '4.8.2c',
        name: 'Onboarding — Clients',
        covers: ['UC 4.6.2 Complete Onboarding (step 6)', '§4.2.1 shared business memory', '§4.4.9 recipient on record'],
      }}
    >
      <div className="notice warn">
        <span>
          <strong>No clients means no actions.</strong> An agent can only address someone on this list,
          and only cite what is recorded about them. Anyone missing is a stranger, and anything
          addressed to a stranger is refused.
        </span>
      </div>

      <div
        style={{
          display: 'grid', gap: 18,
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))',
        }}
      >
        {clients.map((c, i) => (
          <div className="card" key={c.id}>
            <div className="card-head">
              <h2>{c.name.trim() || `Client ${i + 1}`}</h2>
              <SourceChip source={c.source} confirmed={c.confirmed} />
              <div className="right">
                <span className="pill tiny">{STATUS_NOTE[c.status]}</span>
                <button type="button" className="btn btn-sm btn-quiet" onClick={() => remove(c.id)}>Remove</button>
              </div>
            </div>
            <div className="card-body stack" style={{ gap: 14 }}>
              <div className="field">
                <label htmlFor={`${c.id}-n`}>Client business name</label>
                <input id={`${c.id}-n`} value={c.name} onChange={(e) => setRow(c.id, { name: e.target.value })} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor={`${c.id}-p`}>Primary contact</label>
                  <input id={`${c.id}-p`} value={c.contact} onChange={(e) => setRow(c.id, { contact: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor={`${c.id}-e`}>Contact email</label>
                  <input id={`${c.id}-e`} type="email" value={c.email} onChange={(e) => setRow(c.id, { email: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor={`${c.id}-s`}>Status</label>
                  <select id={`${c.id}-s`} value={c.status} onChange={(e) => setRow(c.id, { status: e.target.value })}>
                    {CLIENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${c.id}-d`}>Relationship start</label>
                  <input id={`${c.id}-d`} type="date" value={c.since} onChange={(e) => setRow(c.id, { since: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor={`${c.id}-l`}>Last contact</label>
                  <input id={`${c.id}-l`} type="date" value={c.last_contact} onChange={(e) => setRow(c.id, { last_contact: e.target.value })} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
                <CustomFields
                  idPrefix="cf"
                  title="Anything else about this client"
                  hint="Facts an agent may cite about them, e.g. industry, contract terms, preferred contact time."
                  labelPlaceholder="e.g. Industry"
                  valuePlaceholder="e.g. Private healthcare"
                  items={c.custom ?? []}
                  onChange={(custom) => setRow(c.id, { custom })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <DropZone onFiles={importFiles} accept=".csv" compact>
        <span style={{ fontWeight: 500 }}>Add clients from a spreadsheet</span>
        <span className="tiny faint">
          A CSV exported from your invoicing, CRM or contacts. Any column names; one row per client or per
          invoice.
        </span>
      </DropZone>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={add}>Add client by hand</button>
        <span className="tiny faint mono">{clients.length} recorded · {counts}</span>
      </div>
      <p className="tiny faint" style={{ margin: 0 }}>
        Last contact comes from your client list or is entered here. Once a mailbox is connected it is read
        from correspondence instead. Imported a file by mistake? Its clients can be removed above, or see{' '}
        <Link href="/onboarding/import" style={{ textDecoration: 'underline' }}>what was read</Link>.
      </p>
    </Frame>
  );
}
