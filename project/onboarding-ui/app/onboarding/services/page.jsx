'use client';

import { useState } from 'react';
import Frame from '../../../components/onboarding/Frame';
import { useOnboarding } from '../../../components/onboarding/state';
import { AGENTS, CONNECTIONS } from '../_data/catalogue';
import { agentStatus } from '../_data/fixture';

/** A fake key. Nothing real is ever requested, returned or stored. */
function mintKey() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `sim_${Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('')}`;
}

const mask = (k) => `${k.slice(0, 8)}â€¦${k.slice(-4)}`;

function StatusPill({ status }) {
  if (status === 'connected') {
    return (
      <span className="pill" style={{ borderColor: 'var(--route-auto)', color: 'var(--route-auto)' }}>
        <span className="dot-m" style={{ background: 'var(--route-auto)' }} />
        Connected
      </span>
    );
  }
  if (status === 'declined') {
    return (
      <span className="pill" style={{ borderColor: 'var(--route-escalate)', color: 'var(--route-escalate)' }}>
        <span className="dot-m" style={{ background: 'var(--route-escalate)' }} />
        Declined
      </span>
    );
  }
  return <span className="pill">Not connected</span>;
}

function ConsentPanel({ service, owner, onAllow, onDecline }) {
  const s = CONNECTIONS[service];
  return (
    <div
      role="dialog"
      aria-label={`Authorise ${s.name}`}
      style={{ margin: '0 18px 18px', border: '1px solid var(--ink)', background: 'var(--paper)' }}
    >
      <div
        className="mono tiny"
        style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}
      >
        Simulated authorisation page â€” no real account is contacted
      </div>
      <div style={{ padding: 18 }} className="stack">
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Bizzii wants access to your {s.name.toLowerCase()}</div>
          <div className="tiny faint" style={{ marginTop: 3 }}>Signed in as {owner}</div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }} className="stack">
          {s.scopes.map((x) => <li key={x} style={{ marginTop: -10 }}>{x}</li>)}
        </ul>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAllow}>Allow</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onDecline}>Decline</button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectServices() {
  const { profile, update } = useOnboarding();
  const conns = profile.connections;
  const [open, setOpen] = useState(null);

  const set = (key, v) => update('connections', { [key]: v });
  // only a decision to decline makes an agent inactive; undecided is not yet a state
  const inactive = Object.entries(agentStatus(conns)).filter(([, s]) =>
    s.missing.some((c) => conns[c].status === 'declined'),
  );
  const pending = Object.entries(conns).filter(([, v]) => v.status === 'pending');

  return (
    <Frame
      step={6}
      title="Connect the accounts the agents work through"
      lede="In use you are sent to each serviceâ€™s own authorisation page, and keys are stored encrypted and never written to a log (Â§4.4.6). In this prototype both are simulated: the consent panel is fake and the key it returns is a placeholder."
      readBy={[
        { field: 'Email account', by: 'Operations and Sales Agents, to read correspondence and send approved replies' },
        { field: 'Task management tool', by: 'Project Management Agent, to record approved tasks and read progress' },
      ]}
      blocked={pending.length ? `Connect or decline the ${pending.map(([k]) => CONNECTIONS[k].name.toLowerCase()).join(' and ')}` : null}
      art={{ variant: 'ridge', tone: 'blue' }}
      anno={{
        fig: '4.8.3',
        name: 'Onboarding â€” Connect Services',
        covers: ['UC 4.6.2 steps 10â€“12 Â· 11-A decline Â· UC 4.6.3 Connect an External Account', 'Â§4.4.6 keys stored encrypted, never logged'],
      }}
    >
      <div className="card">
        {Object.entries(CONNECTIONS).map(([key, s]) => {
          const c = conns[key];
          const users = Object.entries(AGENTS).filter(([, a]) => a.needs.includes(key)).map(([, a]) => a.name);
          return (
            <div key={key} style={{ borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '16px 18px' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  <div className="tiny faint" style={{ marginTop: 3 }}>{s.note}</div>
                  <div className="tiny faint" style={{ marginTop: 3 }}>Needed by: {users.join(', ')}</div>
                  {c.key ? <div className="tiny mono faint" style={{ marginTop: 3 }}>Key {mask(c.key)}</div> : null}
                </div>
                <StatusPill status={c.status} />
                {c.status === 'pending' ? (
                  <button type="button" className="btn btn-sm" onClick={() => setOpen(key)} disabled={open === key}>
                    Authorise
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-quiet"
                    onClick={() => {
                      set(key, { status: 'pending', key: null });
                      setOpen(null);
                    }}
                  >
                    {c.status === 'connected' ? 'Disconnect' : 'Reconsider'}
                  </button>
                )}
              </div>
              {open === key ? (
                <ConsentPanel
                  service={key}
                  owner={profile.business.owner_email}
                  onAllow={() => {
                    set(key, { status: 'connected', key: mintKey() });
                    setOpen(null);
                  }}
                  onDecline={() => {
                    set(key, { status: 'declined', key: null });
                    setOpen(null);
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {inactive.length ? (
        <div className="notice danger">
          <span>
            <strong>
              {inactive.map(([k]) => `${AGENTS[k].name} Agent`).join(' and ')} will be recorded as
              inactive.
            </strong>{' '}
            {inactive.length === 1 ? 'It proposes' : 'They propose'} nothing until the missing service
            is connected, which you can do at any time from Connected services (UC 4.6.2 11-A).
          </span>
        </div>
      ) : (
        <div className="notice">
          <span>
            You may finish without connecting a service. The agents that depend on it are recorded as
            inactive until you do (UC 4.6.2 11-A).
          </span>
        </div>
      )}
    </Frame>
  );
}
