import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';

const TASKS = [
  { t: 'Homepage copy — Avery Logistics', p: 'Avery Logistics — site refresh', a: 'Sana Qureshi', s: 'In progress', d: '11 days', ref: 'NL-412', stalled: true },
  { t: 'Brand guidelines v2 — section 4', p: 'Meridian — brand guidelines', a: 'Imran Shah', s: 'In progress', d: '2 days', ref: 'NL-408' },
  { t: 'Asset export', p: 'Castlebrook — site build', a: 'Imran Shah', s: 'In progress', d: '1 day', ref: 'NL-401' },
  { t: 'Sitemap draft', p: 'Avery Logistics — site refresh', a: 'Imran Shah', s: 'Complete', d: '—', ref: 'NL-399' },
  { t: 'Logo lockup variants', p: 'Meridian — brand guidelines', a: 'Sana Qureshi', s: 'Complete', d: '—', ref: 'NL-396' },
  { t: 'Contact form and submission', p: 'Avery Logistics — site refresh', a: 'Unassigned', s: 'Open', d: '—', ref: '—', unassigned: true },
];

function StatusPill({ s }) {
  const map = {
    Complete: 'var(--route-auto)',
    'In progress': 'var(--route-approve)',
    Open: 'var(--ink-faint)',
  };
  return (
    <span className="pill" style={{ borderColor: map[s], color: map[s] }}>
      <span className="dot-m" style={{ background: map[s] }} />
      {s}
    </span>
  );
}

export default function Tasks() {
  return (
    <>
      <Shell
        title="Tasks"
        sub="18 across 3 projects · progress read from the task tool"
        right={<span className="pill mono">Read 08:40</span>}
      >
        <div className="content narrow stack">
          <div className="notice warn">
            <span>
              <strong>One task has not progressed for 11 days.</strong> The Project Management
              Agent has proposed reassigning “Homepage copy — Avery Logistics” from Sana Qureshi to
              Imran Shah. It is in a recall window and will go ahead unless you stop it.{' '}
              <Link href="/app/recall" style={{ textDecoration: 'underline' }}>Open it</Link>
            </span>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>All tasks</h2>
              <div className="right">
                <span className="pill mono">1 stalled</span>
                <span className="pill mono">1 unassigned</span>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Task</th><th>Project</th><th>Assignee</th>
                    <th>Status</th><th>No movement</th><th>In task tool</th>
                  </tr>
                </thead>
                <tbody>
                  {TASKS.map((t) => (
                    <tr key={t.ref + t.t} className="clickable">
                      <td>
                        <span style={{ fontWeight: 500 }}>{t.t}</span>
                        {t.stalled ? (
                          <div className="tiny" style={{ marginTop: 3, color: 'var(--route-recall)' }}>
                            Stalled — reassignment proposed
                          </div>
                        ) : null}
                        {t.unassigned ? (
                          <div className="tiny faint" style={{ marginTop: 3 }}>
                            No recorded skills match — placed before you unassigned
                          </div>
                        ) : null}
                      </td>
                      <td className="dim tiny">{t.p}</td>
                      <td className={t.unassigned ? 'faint' : 'dim'}>{t.a}</td>
                      <td><StatusPill s={t.s} /></td>
                      <td className="mono tiny faint">{t.d}</td>
                      <td className="mono tiny faint">{t.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="tiny faint" style={{ margin: 0 }}>
            The team receives and updates this work in the external task management tool. Bizzii
            records approved tasks there and reads their progress back; nobody but the owner signs
            in here (§4.2.4, §4.4.6).
          </p>
        </div>
      </Shell>

      <Anno
        fig="4.8.12"
        name="Tasks"
        covers={[
          'UC 4.6.14 Propose a Task Assignment',
          'UC 4.6.15 Identify a Stalled Task and Propose Its Reassignment',
          'UC 4.6.16 Record an Approved Task in the Task Management System',
        ]}
      />
    </>
  );
}
