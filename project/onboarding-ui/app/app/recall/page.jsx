import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { RiskPill, RoutePill, Competence, Evidence } from '../../../components/bits';

const FACTS = [
  {
    id: 'F-2301',
    statement: '“Homepage copy — Avery Logistics” has not changed state in 11 days.',
    source: 'Task tool · read 03 Oct 08:40',
  },
  {
    id: 'F-2277',
    statement: 'Imran Shah lists copywriting and long-form content among his skills.',
    source: 'Team record · recorded by the owner 14 Aug',
  },
];

export default function Recall() {
  return (
    <>
      <Shell
        active="recall"
        title="In its recall window"
        sub="A-4452 · Project Management Agent"
        right={<RoutePill route="recall" />}
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
            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <h2>Reassign “Homepage copy — Avery Logistics”</h2>
                </div>
                <div className="meta-grid">
                  <div className="meta-cell">
                    <div className="meta-k">From</div>
                    <div className="meta-v" style={{ fontSize: 14 }}>Sana Qureshi</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">To</div>
                    <div className="meta-v" style={{ fontSize: 14 }}>Imran Shah</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Stalled for</div>
                    <div className="meta-v num">11 days</div>
                  </div>
                </div>
                <div className="card-body">
                  <Evidence facts={FACTS} />
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>How this was routed</h2></div>
                <div className="card-body stack" style={{ gap: 16 }}>
                  <div>
                    <div className="meta-k">Risk</div>
                    <div style={{ marginTop: 6 }}><RiskPill level="moderate" score={0.44} /></div>
                  </div>
                  <div>
                    <div className="meta-k" style={{ marginBottom: 7 }}>
                      Competence — Project Management Agent at “reassign a task”
                    </div>
                    <Competence lower={0.84} successes={41} outcomes={44} required={0.75} />
                  </div>
                  <div className="notice warn">
                    <span>
                      The agent has earned automatic execution at this class, but the action
                      reaches a teammate and cannot be fully undone, so it waits in a recall window
                      rather than running at once (§4.2.2).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>Carried out in</h2></div>
                <div className="card-body stack" style={{ gap: 16 }}>
                  <div>
                    <div className="countdown">02:47:10</div>
                    <p className="tiny faint" style={{ margin: '6px 0 0' }}>
                      Unless you stop it. Nothing is sent to the task tool before then.
                    </p>
                  </div>

                  <Link href="/app/activity" className="btn btn-danger" style={{ width: '100%' }}>
                    Stop this action
                  </Link>

                  <div>
                    <div className="meta-k" style={{ marginBottom: 8 }}>Reason for stopping</div>
                    <div className="radio-list">
                      <label className="radio-row">
                        <input type="radio" name="reason" defaultChecked />
                        <span><span className="rl-title">The content is wrong</span></span>
                      </label>
                      <label className="radio-row">
                        <input type="radio" name="reason" />
                        <span><span className="rl-title">The timing is wrong</span></span>
                      </label>
                      <label className="radio-row">
                        <input type="radio" name="reason" />
                        <span>
                          <span className="rl-title">I would rather do this one myself</span>
                          <span className="rl-note" style={{ display: 'block' }}>
                            Does not count against the agent
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <p className="tiny faint" style={{ margin: 0 }}>
                    A stopped action was never carried out, so it counts towards the competence
                    score no more than a rejected one does (UC 4.6.25).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.7"
        name="Recall Window"
        covers={[
          'UC 4.6.25 Stop an Action Within Its Recall Window',
          '§4.2.2 recall where the agent has earned automatic execution but the action is irreversible',
        ]}
      />
    </>
  );
}
