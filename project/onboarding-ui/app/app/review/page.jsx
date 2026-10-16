import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { RiskPill, RoutePill, Competence, Evidence } from '../../../components/bits';

const FACTS = [
  {
    id: 'F-2291',
    statement:
      'Meridian Design Co. asked on 29 September whether the brand guidelines can be delivered before their board meeting.',
    source: 'Message 18f2a9c · received 29 Sep 14:12',
  },
  {
    id: 'F-2288',
    statement: 'The agreed delivery date for “Brand guidelines v2” is 14 October.',
    source: 'Project P-118 · recorded by the owner 02 Sep',
  },
  {
    id: 'F-2294',
    statement: 'Of six subtasks under “Brand guidelines v2”, four are complete and two are in progress.',
    source: 'Task tool · read 03 Oct 08:40',
  },
];

const DRAFT = `Hi Daniyal,

Thanks for checking in. The brand guidelines are on track for the agreed date of 14 October — four of the six sections are finished and the remaining two are in progress.

If the board meeting falls before that, let me know the date and I'll see what can be brought forward.

Best,
Ayesha
Northline Studio`;

export default function Review() {
  return (
    <>
      <Shell
        active="queue"
        title="Review an action"
        sub="A-4465 · Operations Agent"
        right={
          <>
            <Link href="/app/queue" className="btn btn-sm btn-quiet">Back to queue</Link>
            <span className="pill mono">Open 00:12</span>
          </>
        }
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
            {/* ---- what the action would do ---- */}
            <div className="stack" style={{ gridColumn: 'span 1' }}>
              <div className="card">
                <div className="card-head">
                  <h2>Send a reply to Meridian Design Co.</h2>
                  <div className="right"><RoutePill route="approval" /></div>
                </div>
                <div className="card-body stack" style={{ gap: 14 }}>
                  <div className="meta-grid" style={{ margin: '-18px -18px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <div className="meta-cell">
                      <div className="meta-k">To</div>
                      <div className="meta-v" style={{ fontSize: 14 }}>daniyal@meridiandesign.co</div>
                    </div>
                    <div className="meta-cell">
                      <div className="meta-k">Action class</div>
                      <div className="meta-v" style={{ fontSize: 14 }}>Reply to client</div>
                    </div>
                    <div className="meta-cell">
                      <div className="meta-k">Reversibility</div>
                      <div className="meta-v" style={{ fontSize: 14 }}>Not reversible</div>
                    </div>
                  </div>

                  <div className="draft">{DRAFT}</div>

                  <div className="notice">
                    <span>
                      The address is the one on record for this client. A request inside the message
                      to reply elsewhere is treated as information, not an instruction (§4.4.9).
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <h2>Evidence — 3 facts cited</h2>
                </div>
                <div className="card-body">
                  <Evidence facts={FACTS} />
                </div>
              </div>
            </div>

            {/* ---- how the gate judged it ---- */}
            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>How this was routed</h2></div>
                <div className="card-body stack" style={{ gap: 18 }}>
                  <div>
                    <div className="meta-k">Risk</div>
                    <div style={{ marginTop: 6 }}><RiskPill level="high" score={0.62} /></div>
                    <p className="tiny faint" style={{ margin: '9px 0 0' }}>
                      Reaches one client · communicates · one party · not reversible
                    </p>
                  </div>

                  <div>
                    <div className="meta-k" style={{ marginBottom: 7 }}>
                      Competence — Operations Agent at “reply to client”
                    </div>
                    <Competence lower={0.71} successes={16} outcomes={18} required={0.80} />
                  </div>

                  <div>
                    <div className="meta-k" style={{ marginBottom: 7 }}>Proportion approved</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span className="mono" style={{ fontSize: 24, fontWeight: 500 }}>0.87</span>
                      <span className="tiny faint">13 of 15 decided proposals</span>
                    </div>
                    <p className="tiny faint" style={{ margin: '7px 0 0' }}>
                      Held separately from competence; neither affects the other (§4.4.3).
                    </p>
                  </div>

                  <div className="notice">
                    <span>
                      <strong>Why you are being asked.</strong> Competence at this class is 0.71,
                      below the 0.80 this class requires. The action returns to you until the
                      recorded outcomes support that level.
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>If this is wrong</h2></div>
                <div className="card-body">
                  <p style={{ margin: 0, fontSize: 14 }} className="dim">
                    A client receives a delivery date the business may not meet. The message cannot
                    be recalled once sent; the commitment would have to be corrected in a further
                    message.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>Decide</h2></div>
                <div className="card-body stack" style={{ gap: 14 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link href="/app/queue" className="btn btn-primary" style={{ flex: '1 1 150px' }}>
                      Approve &amp; send
                    </Link>
                    <Link href="/app/queue" className="btn btn-danger" style={{ flex: '1 1 150px' }}>
                      Reject
                    </Link>
                  </div>

                  <div>
                    <div className="meta-k" style={{ marginBottom: 8 }}>Reason for rejecting</div>
                    <div className="radio-list">
                      <label className="radio-row">
                        <input type="radio" name="reason" defaultChecked />
                        <span>
                          <span className="rl-title">The content is wrong</span>
                          <span className="rl-note" style={{ display: 'block' }}>
                            Counts against the proportion approved
                          </span>
                        </span>
                      </label>
                      <label className="radio-row">
                        <input type="radio" name="reason" />
                        <span>
                          <span className="rl-title">The timing is wrong</span>
                          <span className="rl-note" style={{ display: 'block' }}>
                            Counts against the proportion approved
                          </span>
                        </span>
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
                    <p className="tiny faint" style={{ margin: '10px 0 0' }}>
                      The third reason measures your appetite for delegating, not the agent&rsquo;s
                      competence, so it is excluded from both measures (§4.4.3).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.5"
        name="Action Review"
        covers={[
          'UC 4.6.24 Review an Action',
          '§4.4.4 one screen, two steps, dwell time recorded',
          '§4.4.3 rejection reason codes',
          '§4.4.9 guardrails on what may be proposed',
        ]}
      />
    </>
  );
}
