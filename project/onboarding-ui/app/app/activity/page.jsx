import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { RoutePill } from '../../../components/bits';

const ROWS = [
  { id: 'A-4449', when: '03 Oct 09:14', agent: 'Operations', action: 'Recorded 4 facts from Harbour & Fin correspondence', route: 'automatic', outcome: 'Successful' },
  { id: 'A-4447', when: '03 Oct 08:52', agent: 'Project Mgmt', action: 'Assigned “Logo lockup variants” to Sana Qureshi', route: 'automatic', outcome: 'Successful' },
  { id: 'A-4441', when: '02 Oct 17:30', agent: 'Project Mgmt', action: 'Assigned “Sitemap draft” to Imran Shah', route: 'recall', outcome: 'Successful' },
  { id: 'A-4438', when: '02 Oct 16:05', agent: 'Operations', action: 'Flagged Castlebrook Dental as at risk', route: 'automatic', outcome: 'Not yet observed' },
  { id: 'A-4433', when: '02 Oct 11:20', agent: 'Project Mgmt', action: 'Assigned “Asset export” to Sana Qureshi', route: 'automatic', outcome: 'Unsuccessful' },
  { id: 'A-4430', when: '01 Oct 15:48', agent: 'Operations', action: 'Recorded 2 facts from Avery Logistics correspondence', route: 'automatic', outcome: 'Successful' },
];

function OutcomePill({ v }) {
  const color =
    v === 'Successful' ? 'var(--route-auto)' : v === 'Unsuccessful' ? 'var(--route-escalate)' : 'var(--ink-faint)';
  return (
    <span className="pill" style={{ borderColor: color, color }}>
      <span className="dot-m" style={{ background: color }} />
      {v}
    </span>
  );
}

export default function Activity() {
  return (
    <>
      <Shell
        active="activity"
        title="Activity"
        sub="What the agents did without asking, and what came of it"
        right={<span className="pill mono">Last 7 days · 38 actions</span>}
      >
        <div className="content narrow stack">
          <div className="notice">
            <span>
              Everything an agent did without asking appears here after the fact, with the basis on
              which it was routed. Where you disagree with what an action did, correcting the record
              is treated as an override and the action is recorded as unsuccessful (UC 4.6.6 3-B).
            </span>
          </div>

          <div className="card">
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>When</th><th>Action</th><th>Agent</th><th>Route</th><th>Outcome</th><th />
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.id} className="clickable">
                      <td className="mono tiny faint" style={{ whiteSpace: 'nowrap' }}>{r.when}</td>
                      <td>
                        <Link href="/app/activity/detail" style={{ fontWeight: 500 }}>{r.action}</Link>
                        <div className="tiny faint mono" style={{ marginTop: 3 }}>{r.id}</div>
                      </td>
                      <td className="dim">{r.agent}</td>
                      <td><RoutePill route={r.route} /></td>
                      <td><OutcomePill v={r.outcome} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href="/app/activity/detail" className="btn btn-sm btn-quiet">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.8"
        name="Activity Record"
        covers={[
          'UC 4.6.6 Review the Record of Automatic Actions',
          '§4.2.8 a record of actions executed automatically',
        ]}
      />
    </>
  );
}
