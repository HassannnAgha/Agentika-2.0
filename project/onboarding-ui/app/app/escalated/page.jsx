import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { RiskPill, RoutePill } from '../../../components/bits';

const LEADS = [
  { n: 'Castlebrook Dental', c: 'hello@castlebrookdental.pk', l: 'Lahore' },
  { n: 'Riverside Orthodontics', c: 'front.desk@riversideortho.pk', l: 'Lahore' },
  { n: 'Ayan Family Dentistry', c: 'contact@ayandental.pk', l: 'Lahore' },
  { n: 'Gulberg Dental Studio', c: 'info@gulbergdental.pk', l: 'Lahore' },
];

const MESSAGE = `Hello {{practice name}},

I'm Ayesha from Northline Studio. We build websites and brand material for independent dental practices in Lahore — most recently a booking-led site for a practice of your size.

If you're thinking about your website this quarter, I'd be glad to send over two or three examples. No obligation either way.

Best,
Ayesha Raza
Northline Studio`;

export default function Escalated() {
  return (
    <>
      <Shell
        active="escalated"
        title="Escalated — approve a campaign"
        sub="A-4471 · Sales Agent"
        right={<Link href="/app/queue" className="btn btn-sm btn-quiet">Back to queue</Link>}
      >
        <div className="content narrow stack">
          <div className="notice danger">
            <span>
              <strong>Escalated under a rule fixed in the system.</strong> Making unsolicited
              contact with a prospect always requires your approval, however competent the Sales
              Agent becomes. No setting available to you can lift this rule (§4.2.2, §4.4.1).
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <h2>The message each lead would receive</h2>
                  <div className="right"><RoutePill route="escalation" /></div>
                </div>
                <div className="card-body stack" style={{ gap: 13 }}>
                  <div className="draft">{MESSAGE}</div>
                  <p className="tiny faint" style={{ margin: 0 }}>
                    The draft states no price and no date, neither being recorded as a fact
                    (§4.4.9). The example above is addressed to Castlebrook Dental.
                  </p>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>Terms of the campaign</h2></div>
                <div className="meta-grid">
                  <div className="meta-cell">
                    <div className="meta-k">Leads</div>
                    <div className="meta-v num">24</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Send window</div>
                    <div className="meta-v" style={{ fontSize: 14 }}>6 – 17 Oct</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Risk</div>
                    <div style={{ marginTop: 3 }}><RiskPill level="critical" score={0.91} /></div>
                  </div>
                </div>
                <div className="card-body">
                  <p className="tiny faint" style={{ margin: 0 }}>
                    One decision covers every lead on the list. No message is sent to a lead who is
                    not on it, nor after 17 October. Adding a lead later requires a new campaign
                    (§4.2.5).
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>If this is wrong</h2></div>
                <div className="card-body">
                  <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                    Twenty-four businesses that have never contacted Northline Studio receive mail
                    from it. Messages cannot be recalled once sent, and the business&rsquo;s
                    standing with a prospect is affected before any relationship exists.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>Decide</h2></div>
                <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/app/queue" className="btn btn-primary" style={{ flex: '1 1 160px' }}>
                    Approve campaign
                  </Link>
                  <Link href="/app/queue" className="btn btn-danger" style={{ flex: '1 1 160px' }}>
                    Reject
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Approved list — 24 leads</h2>
              <div className="right"><span className="pill mono">4 of 24 shown</span></div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr><th>Business</th><th>Contact</th><th>Location</th><th /></tr>
                </thead>
                <tbody>
                  {LEADS.map((l) => (
                    <tr key={l.n}>
                      <td style={{ fontWeight: 500 }}>{l.n}</td>
                      <td className="dim mono tiny">{l.c}</td>
                      <td className="dim">{l.l}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn btn-sm btn-quiet">Remove</button>
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
        fig="4.8.6"
        name="Escalated — Campaign Approval"
        covers={[
          'UC 4.6.19 Approve a Campaign',
          'UC 4.6.23 4-C escalation under a fixed rule',
          '§4.2.5 campaign decided once, not lead by lead',
        ]}
      />
    </>
  );
}
