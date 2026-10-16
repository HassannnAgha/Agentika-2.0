'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Frame from '../../../components/onboarding/Frame';
import { RoutePill } from '../../../components/bits';
import { useOnboarding } from '../../../components/onboarding/state';
import { AGENTS, CEILING_TEXT, CLASSES } from '../_data/catalogue';
import { agentStatus, buildFixture } from '../_data/fixture';

const OLDEST_SHOWN = 3;

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'business';

export default function ReviewAndStart() {
  const { profile, update } = useOnboarding();
  const [copied, setCopied] = useState(false);

  const fixture = useMemo(() => buildFixture(profile), [profile]);
  const json = useMemo(() => JSON.stringify(fixture, null, 2), [fixture]);
  const status = agentStatus(profile.connections);

  // prospects are not yet clients, so silence from them is not a lapse
  const oldest = profile.clients
    .filter((c) => c.status !== 'prospect' && c.last_contact)
    .sort((a, b) => a.last_contact.localeCompare(b.last_contact))
    .slice(0, OLDEST_SHOWN);

  const toggleTakeUp = (id) =>
    update('take_up', profile.take_up.includes(id) ? profile.take_up.filter((x) => x !== id) : [...profile.take_up, id]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(profile.business.name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* clipboard blocked: the download still works */
    }
  };

  const connected = Object.values(profile.connections).filter((c) => c.status === 'connected').length;

  // Hand the setup record to the gate server: it becomes the business memory every agent reads,
  // and the guardrail checks facts against it. Then go to the approvals dashboard.
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const start = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'The gate server rejected the setup record.');
      window.location.href = '/gate';
    } catch (e) {
      setStartError(e.message || 'Could not reach the gate server.');
      setStarting(false);
    }
  };

  return (
    <Frame
      step={7}
      wide
      title="Review, then start"
      lede="Nothing has been proposed yet. Below is what the agents found to begin with, and what each of them may do on its own today."
      onNext={start}
      blocked={starting ? 'Starting…' : null}
      nextLabel="Start Bizzii"
      art={{ variant: 'peak', tone: 'mono' }}
      anno={{
        fig: '4.8.3a',
        name: 'Onboarding â€” Review and Start',
        covers: ['UC 4.6.2 Complete Onboarding (steps 13â€“14)', 'Â§4.4.3 cold start: every class begins at owner approval', 'Plan B1 fixture emitted'],
      }}
    >
      {startError ? (
        <div className="notice danger"><span><strong>Could not start.</strong> {startError}</span></div>
      ) : null}

      <div className="card">
        <div className="meta-grid">
          {[
            ['Business', profile.business.name],
            ['Approver', profile.business.owner_name],
            ['Team', `${profile.team.length} recorded`],
            ['Clients', `${profile.clients.length} recorded`],
            ['Permitted claims', fixture.brand.permitted_claims.length],
            ['Services', `${connected} of ${Object.keys(profile.connections).length} connected`],
          ].map(([k, v]) => (
            <div className="meta-cell" key={k}>
              <div className="meta-k">{k}</div>
              <div className="meta-v">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* --- panel 1: the oldest relationships, as a notice, not as proposals --- */}
      <div className="card">
        <div className="card-head">
          <h2>Clients you have not heard from longest</h2>
          <div className="right"><span className="tiny faint">A notice, not a proposal</span></div>
        </div>
        <div className="card-body stack" style={{ gap: 14 }}>
          <p className="dim" style={{ margin: 0, fontSize: 14 }}>
            The agents will not write to anyone on the strength of a date alone. Say which of these you
            want taken up, and the Operations Agent will start from those.
          </p>
          {oldest.length ? (
            <div className="radio-list">
              {oldest.map((c) => (
                <label className="radio-row" key={c.id}>
                  <input type="checkbox" checked={profile.take_up.includes(c.id)} onChange={() => toggleTakeUp(c.id)} />
                  <span style={{ flex: 1 }}>
                    <span className="rl-title" style={{ display: 'block' }}>{c.name}</span>
                    <span className="rl-note">
                      {c.contact || 'No contact recorded'} Â· last contact {fmtDate(c.last_contact)} Â· {c.status}
                    </span>
                  </span>
                  <span className="tiny faint" style={{ alignSelf: 'center' }}>
                    {profile.take_up.includes(c.id) ? 'Take up' : 'Leave for now'}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="notice"><span>No client has a last contact date recorded.</span></div>
          )}
        </div>
      </div>

      {/* --- panel 2: every action class, all at owner approval --- */}
      <div className="card">
        <div className="card-head">
          <h2>What your agents may do on their own today</h2>
          <div className="right"><span className="pill mono">0 of {CLASSES.length}</span></div>
        </div>
        <div className="card-body" style={{ paddingBottom: 6 }}>
          <p className="dim" style={{ margin: 0, fontSize: 14 }}>
            Nothing. Every kind of action starts by asking you, because no agent has a record yet and
            a clean record of zero attempts scores zero: competence is <span className="mono">m / (m + zÂ²)</span>{' '}
            for <span className="mono">m</span> clean outcomes, and <span className="mono">m = 0</span>. The
            last column is what each one can earn as you approve its work.
          </p>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Kind of action</th>
                <th>Today</th>
                <th>Outcomes</th>
                <th>Competence</th>
                <th>Can earn</th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((k) => {
                const live = status[k.agent].active;
                return (
                  <tr key={k.name} style={live ? undefined : { opacity: 0.55 }}>
                    <td className="dim" style={{ whiteSpace: 'nowrap' }}>{AGENTS[k.agent].name}</td>
                    <td style={{ fontWeight: 500 }}>
                      {k.name}
                      {k.ref !== 'â€”' ? (
                        <span className="mono faint tiny" style={{ display: 'block', fontWeight: 400 }}>{k.ref}</span>
                      ) : null}
                    </td>
                    <td>
                      {live ? (
                        <RoutePill route="approval" />
                      ) : (
                        <span className="pill">Inactive â€” not connected</span>
                      )}
                    </td>
                    <td className="mono dim">0</td>
                    <td className="mono dim">0.00</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <RoutePill route={k.ceiling} />
                        <span className="tiny faint">{CEILING_TEXT[k.ceiling]}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- the emitted fixture --- */}
      <div className="card">
        <div className="card-head">
          <h2>Setup record</h2>
          <div className="right">
            <button type="button" className="btn btn-sm btn-quiet" onClick={copy}>{copied ? 'Copied' : 'Copy JSON'}</button>
            <button type="button" className="btn btn-sm" onClick={download}>Download fixture</button>
          </div>
        </div>
        <div className="card-body stack" style={{ gap: 12 }}>
          <p className="dim" style={{ margin: 0, fontSize: 14 }}>
            Everything above, in the same fixture format the simulator reads. Save it to{' '}
            <span className="mono">platform/fixtures/</span> and seed with{' '}
            <span className="mono">scripts/seed_from_onboarding.py</span>.
          </p>
          <details>
            <summary className="tiny" style={{ cursor: 'pointer' }}>Show the JSON</summary>
            <pre
              className="mono"
              style={{
                margin: '10px 0 0', maxHeight: 360, overflow: 'auto', fontSize: 12,
                background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-ctl)', padding: 14,
              }}
            >
              {json}
            </pre>
          </details>
        </div>
      </div>

      <p className="tiny faint" style={{ margin: 0 }}>
        Everything here can be changed later from the console. <Link href="/onboarding" style={{ textDecoration: 'underline' }}>Back to the first screen</Link>
      </p>
    </Frame>
  );
}
