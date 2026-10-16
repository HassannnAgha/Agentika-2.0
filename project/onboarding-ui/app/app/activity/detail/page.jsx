import Link from 'next/link';
import Shell from '../../../../components/Shell';
import Anno from '../../../../components/Anno';
import { RiskPill, RoutePill, Competence, Evidence } from '../../../../components/bits';

const FACTS = [
  {
    id: 'F-2264',
    statement: 'Sana Qureshi lists illustration and asset preparation among her skills.',
    source: 'Team record · recorded by the owner 14 Aug',
  },
  {
    id: 'F-2270',
    statement: '“Asset export” belongs to project “Castlebrook Dental — site build”.',
    source: 'Project P-121 · confirmed by the owner 21 Sep',
  },
];

export default function ActivityDetail() {
  return (
    <>
      <Shell
        active="activity"
        title="Assigned “Asset export” to Sana Qureshi"
        sub="A-4433 · Project Management Agent · 02 Oct 11:20"
        right={<Link href="/app/activity" className="btn btn-sm btn-quiet">Back to activity</Link>}
      >
        <div className="content narrow stack">
          <div className="card">
            <div className="card-head">
              <h2>Decision record</h2>
              <div className="right">
                <RoutePill route="automatic" />
                <span className="pill mono">policy v1.3.0</span>
              </div>
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-k">Risk at decision</div>
                <div style={{ marginTop: 3 }}><RiskPill level="low" score={0.19} /></div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Competence at decision</div>
                <div className="meta-v num">0.84</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Decided by</div>
                <div className="meta-v" style={{ fontSize: 14 }}>The gate</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Outcome</div>
                <div className="meta-v" style={{ fontSize: 14, color: 'var(--route-escalate)' }}>
                  Unsuccessful
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            <div className="card">
              <div className="card-head"><h2>Evidence the action was formed from</h2></div>
              <div className="card-body"><Evidence facts={FACTS} /></div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>What followed</h2></div>
                <div className="card-body stack" style={{ gap: 13 }}>
                  <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                    You reassigned the task to Imran Shah on 02 October at 14:06. An owner override
                    is recorded as an unsuccessful outcome (UC 4.6.27 2-A).
                  </p>
                  <div className="notice">
                    <span>
                      This outcome lowered the Project Management Agent&rsquo;s competence at
                      “assign a task” from 0.86 to 0.84.
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>Competence now</h2></div>
                <div className="card-body">
                  <Competence lower={0.84} successes={41} outcomes={44} required={0.75} />
                </div>
              </div>
            </div>
          </div>

          <p className="tiny faint" style={{ margin: 0 }}>
            The decision record is written once and never altered. Later events are recorded
            separately rather than overwriting it, so the basis of the original route survives
            (§4.4.2, §6.6.4).
          </p>
        </div>
      </Shell>

      <Anno
        fig="4.8.9"
        name="Automatic Action — Detail"
        covers={[
          'UC 4.6.6 step 4 · UC 4.6.27 Record an Outcome',
          '§4.4.2 evidence, scores, route and outcome kept for every action',
        ]}
      />
    </>
  );
}
