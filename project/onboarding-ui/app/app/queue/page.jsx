import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { RiskPill, RoutePill } from '../../../components/bits';

const QUEUE = [
  {
    id: 'A-4471', href: '/escalated', agent: 'Sales', action: 'Outreach campaign — 24 leads, dental practices, Lahore',
    risk: 'critical', score: 0.91, route: 'escalation', expires: '31h', rule: 'Unsolicited contact',
  },
  {
    id: 'A-4468', href: '/escalated', agent: 'Marketing', action: 'Publish case study to the public site',
    risk: 'critical', score: 0.88, route: 'escalation', expires: '44h', rule: 'Public and irreversible',
  },
  {
    id: 'A-4465', href: '/review', agent: 'Operations', action: 'Reply to Meridian Design Co. — revised delivery date',
    risk: 'high', score: 0.62, route: 'approval', expires: '18h',
  },
  {
    id: 'A-4462', href: '/review', agent: 'Project Mgmt', action: 'Reassign “Brand guidelines v2” from Sana to Imran',
    risk: 'high', score: 0.58, route: 'approval', expires: '21h',
  },
  {
    id: 'A-4459', href: '/review', agent: 'Operations', action: 'Follow-up to Harbour & Fin — no reply in 9 days',
    risk: 'moderate', score: 0.41, route: 'approval', expires: '2d',
  },
  {
    id: 'A-4457', href: '/marketing', agent: 'Marketing', action: 'Draft — October newsletter, section on the Castlebrook launch',
    risk: 'moderate', score: 0.37, route: 'approval', expires: '3d',
  },
  {
    id: 'A-4454', href: '/review', agent: 'Project Mgmt', action: 'Create 6 subtasks under “Avery Logistics — site refresh”',
    risk: 'low', score: 0.22, route: 'approval', expires: '4d',
  },
];

export default function Queue() {
  return (
    <>
      <Shell
        active="queue"
        title="Approvals"
        sub="7 waiting · ordered by risk, highest first"
        right={<span className="pill mono">Median decision 38s</span>}
      >
        <div className="content narrow stack">
          <div className="notice warn">
            <span>
              <strong>Two actions are escalated.</strong> They are held under a rule fixed in the
              system and require your approval however competent the agent becomes. They are listed
              first and marked with the rule that caused them.
            </span>
          </div>

          <div className="card">
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Risk</th>
                    <th>Action</th>
                    <th>Agent</th>
                    <th>Route</th>
                    <th>Expires</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {QUEUE.map((a) => (
                    <tr key={a.id} className="clickable">
                      <td><RiskPill level={a.risk} score={a.score} /></td>
                      <td>
                        <Link href={a.href} style={{ fontWeight: 500 }}>{a.action}</Link>
                        <div className="tiny faint mono" style={{ marginTop: 3 }}>
                          {a.id}
                          {a.rule ? ` · rule: ${a.rule}` : ''}
                        </div>
                      </td>
                      <td className="dim">{a.agent}</td>
                      <td><RoutePill route={a.route} /></td>
                      <td className="mono tiny faint">{a.expires}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={a.href} className="btn btn-sm btn-quiet">Review</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="tiny faint" style={{ margin: 0 }}>
            An action not decided before it expires is withdrawn, recorded as expired and counted
            towards neither the competence score nor the proportion approved (§4.2.2, §4.4.3).
          </p>
        </div>
      </Shell>

      <Anno
        fig="4.8.4"
        name="Approvals Queue"
        covers={[
          'UC 4.6.24 Review an Action (steps 1–2)',
          '§4.4.4 ordered by risk, highest first',
          '§4.2.2 escalations shown separately',
        ]}
      />
    </>
  );
}
