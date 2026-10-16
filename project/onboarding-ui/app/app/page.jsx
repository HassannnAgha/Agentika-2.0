import Link from 'next/link';
import Shell from '../../components/Shell';
import Anno from '../../components/Anno';
import Halftone from '../../components/Halftone';
import { RiskPill, RoutePill, Meter } from '../../components/bits';

const WAITING = [
  { id: 'A-4471', href: '/app/escalated', what: 'Outreach campaign — 24 dental practices', agent: 'Sales', risk: 'critical', s: 0.91, esc: true },
  { id: 'A-4465', href: '/app/review', what: 'Reply to Meridian Design Co.', agent: 'Operations', risk: 'high', s: 0.62 },
  { id: 'A-4462', href: '/app/review', what: 'Reassign “Brand guidelines v2”', agent: 'Project Mgmt', risk: 'high', s: 0.58 },
];

const AGENTS = [
  { n: 'Operations', t: '#DCE0F2', doing: 'Watching 4 client threads', best: 'Record facts', lower: 0.89, route: 'automatic' },
  { n: 'Project Mgmt', t: '#F7DCD6', doing: '3 projects, 18 tasks', best: 'Assign a task', lower: 0.84, route: 'automatic' },
  { n: 'Sales', t: '#FBEACB', doing: '61 leads, 1 campaign live', best: 'Record a lead', lower: 0.89, route: 'automatic' },
  { n: 'Marketing', t: '#D6EDE2', doing: '1 draft waiting', best: 'Draft content', lower: 0.51, route: 'approval' },
];

export default function Dashboard() {
  return (
    <>
      <Shell
        title="Good morning, Ayesha"
        sub="Friday 3 October · 7 actions waiting"
        right={<Link href="/app/queue" className="btn btn-sm btn-primary">Review the queue</Link>}
      >
        <div className="content narrow stack">
          {/* --- the numbers that matter --- */}
          <div className="card">
            <div className="ht-strip short">
              <Halftone variant="ridge" tone="mono" cols={88} rows={8} fit="xMidYMid slice" />
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-k">Waiting on you</div>
                <div className="meta-v num" style={{ fontSize: 28 }}>7</div>
                <div className="tiny faint" style={{ marginTop: 3 }}>2 escalated</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">In a recall window</div>
                <div className="meta-v num" style={{ fontSize: 28 }}>1</div>
                <div className="tiny faint" style={{ marginTop: 3 }}>2h 47m left</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Done without asking</div>
                <div className="meta-v num" style={{ fontSize: 28 }}>38</div>
                <div className="tiny faint" style={{ marginTop: 3 }}>last 7 days</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Clients at risk</div>
                <div className="meta-v num" style={{ fontSize: 28, color: 'var(--route-escalate)' }}>1</div>
                <div className="tiny faint" style={{ marginTop: 3 }}>Castlebrook Dental</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Median decision</div>
                <div className="meta-v num" style={{ fontSize: 28 }}>38s</div>
                <div className="tiny faint" style={{ marginTop: 3 }}>opened to decided</div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid', gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            {/* --- waiting on you --- */}
            <div className="card">
              <div className="card-head">
                <h2>Waiting on you</h2>
                <div className="right">
                  <Link href="/app/queue" className="btn btn-sm btn-quiet">All 7</Link>
                </div>
              </div>
              <table className="data">
                <tbody>
                  {WAITING.map((w) => (
                    <tr key={w.id} className="clickable">
                      <td>
                        <Link href={w.href} style={{ fontWeight: 500 }}>{w.what}</Link>
                        <div className="tiny faint" style={{ marginTop: 4 }}>
                          {w.agent} · {w.id}
                          {w.esc ? ' · held by a fixed rule' : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <RiskPill level={w.risk} score={w.s} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- needs attention --- */}
            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>Needs your attention</h2></div>
                <div className="card-body stack" style={{ gap: 11 }}>
                  <div className="notice danger">
                    <span>
                      <strong>Castlebrook Dental has gone quiet.</strong> A question from 18
                      September is unanswered and a commitment passed its date.{' '}
                      <Link href="/app/clients" style={{ textDecoration: 'underline' }}>Open the client</Link>
                    </span>
                  </div>
                  <div className="notice warn">
                    <span>
                      <strong>One message could not be read in full.</strong> A scanned PDF from
                      Avery Logistics held no readable text, so no reply was proposed.{' '}
                      <Link href="/app/memory" style={{ textDecoration: 'underline' }}>See the message</Link>
                    </span>
                  </div>
                  <div className="notice">
                    <span>
                      Task management has not been connected. The Project Management Agent cannot
                      record approved work.{' '}
                      <Link href="/app/services" style={{ textDecoration: 'underline' }}>Connect it</Link>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- the agents --- */}
          <div className="card">
            <div className="card-head">
              <h2>Your agents</h2>
              <div className="right">
                <Link href="/app/agents" className="btn btn-sm btn-quiet">Competence in full</Link>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))',
                gap: 1, background: 'var(--line-soft)',
              }}
            >
              {AGENTS.map((a) => (
                <div key={a.n} style={{ background: 'var(--surface)', padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, background: a.t, flex: '0 0 24px' }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{a.n}</span>
                  </div>
                  <div className="tiny faint" style={{ marginBottom: 14 }}>{a.doing}</div>
                  <div className="tiny faint" style={{ marginBottom: 6 }}>
                    Best class — {a.best}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                    <span className="mono" style={{ fontSize: 15 }}>{a.lower.toFixed(2)}</span>
                    <span style={{ flex: 1 }}>
                      <Meter value={a.lower} color={a.route === 'automatic' ? 'var(--route-auto)' : 'var(--ink)'} />
                    </span>
                  </div>
                  <RoutePill route={a.route} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.4"
        name="Dashboard"
        covers={[
          '§4.2.8 Owner Console',
          'UC 4.6.10 client at risk surfaced',
          'UC 4.6.6 record of automatic actions',
        ]}
      />
    </>
  );
}
