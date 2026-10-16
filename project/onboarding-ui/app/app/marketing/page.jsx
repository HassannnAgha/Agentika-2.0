import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { RiskPill, RoutePill, Evidence } from '../../../components/bits';

const FACTS = [
  {
    id: 'F-2240',
    statement: 'Permitted claim: “We build booking-led websites for independent practices.”',
    source: 'Brand material · recorded by the owner 14 Aug',
  },
  {
    id: 'F-2305',
    statement: 'The Castlebrook Dental site build was confirmed complete on 27 September.',
    source: 'Project P-121 · task tool, read 03 Oct',
  },
  {
    id: 'F-2241',
    statement: 'Voice: plain, concrete, no superlatives, first person plural.',
    source: 'Brand material · recorded by the owner 14 Aug',
  },
];

const DRAFT = `Castlebrook Dental came to us with a site that took four clicks to reach a booking form.

We rebuilt it around the one thing their patients actually arrive to do. The booking form now sits on the homepage, the practice hours are readable on a phone, and the whole site loads in under two seconds on a mid-range handset.

The build took five weeks from first call to launch.

If you run an independent practice and your site is getting in the way of bookings, we'd be glad to talk.`;

export default function Marketing() {
  return (
    <>
      <Shell
        active="marketing"
        title="Marketing draft"
        sub="A-4457 · Marketing Agent"
        right={<Link href="/app/queue" className="btn btn-sm btn-quiet">Back to queue</Link>}
      >
        <div className="content narrow">
          <div
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            <div className="card">
              <div className="card-head">
                <h2>October newsletter — Castlebrook launch</h2>
                <div className="right"><RoutePill route="approval" /></div>
              </div>
              <div className="card-body">
                <div className="draft">{DRAFT}</div>
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>Drawn from</h2></div>
                <div className="card-body"><Evidence facts={FACTS} /></div>
              </div>

              <div className="card">
                <div className="card-head"><h2>How this was routed</h2></div>
                <div className="meta-grid">
                  <div className="meta-cell">
                    <div className="meta-k">Risk</div>
                    <div style={{ marginTop: 3 }}><RiskPill level="moderate" score={0.37} /></div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Competence</div>
                    <div className="meta-v num">0.51</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Required</div>
                    <div className="meta-v num">0.70</div>
                  </div>
                </div>
                <div className="card-body">
                  <p className="tiny faint" style={{ margin: 0 }}>
                    Approving retains the draft for your own use. The system does not send or place
                    content anywhere itself (§4.2.6).
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>Decide</h2></div>
                <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/app/queue" className="btn btn-primary" style={{ flex: '1 1 150px' }}>
                    Approve &amp; keep
                  </Link>
                  <Link href="/app/queue" className="btn btn-danger" style={{ flex: '1 1 150px' }}>
                    Reject
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.12"
        name="Marketing Draft Review"
        covers={[
          'UC 4.6.22 Draft Content for the Owner',
          '§4.2.6 approved content retained, never sent or placed by the system',
        ]}
      />
    </>
  );
}
