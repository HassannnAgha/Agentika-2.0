import Link from 'next/link';
import Halftone from '../components/Halftone';
import CatHalftone from '../components/CatHalftone';

const AGENTS = [
  {
    tab: 'Correspondence',
    name: 'Operations',
    role: 'Watches the client relationships',
    tint: '#DCE0F2',
    does: [
      'Reads the owner’s mail and records what was said as facts',
      'Notices a question left unanswered or a commitment past its date',
      'Drafts replies and follow-ups, citing the facts behind them',
    ],
  },
  {
    tab: 'Delivery',
    name: 'Project Management',
    role: 'Turns agreed work into assigned tasks',
    tint: '#F7DCD6',
    does: [
      'Identifies a new project from correspondence, for the owner to confirm',
      'Breaks confirmed work into subtasks',
      'Proposes who should do each one, from recorded skills and past work',
    ],
  },
  {
    tab: 'Pipeline',
    name: 'Sales',
    role: 'Finds prospects and prepares outreach',
    tint: '#FBEACB',
    does: [
      'Finds businesses matching a category and location the owner states',
      'Records their publicly listed details as leads',
      'Prepares outreach as one campaign the owner decides once',
    ],
  },
  {
    tab: 'Voice',
    name: 'Marketing',
    role: 'Drafts in the business’s recorded voice',
    tint: '#D6EDE2',
    does: [
      'Writes to the recorded voice, positioning and permitted claims',
      'Draws on the current recorded state of the business',
      'Hands drafts to the owner — it sends nothing anywhere',
    ],
  },
];

const ROUTES = [
  { c: 'var(--route-auto)', n: 'Carried out', d: 'The agent has shown it can be trusted here, and the action can be undone.' },
  { c: 'var(--route-recall)', n: 'Recall window', d: 'Earned, but irreversible. Shown to you first, and stopped with one click.' },
  { c: 'var(--route-approve)', n: 'Your approval', d: 'Not yet earned, or the evidence is thin. It waits for you.' },
  { c: 'var(--route-escalate)', n: 'Escalated', d: 'Held by a rule no setting can lift. Always yours, however good the agent gets.' },
];

export default function Landing() {
  return (
    <div className="site">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">B</span>
          <span className="brand-name">Bizzii</span>
        </Link>
        <nav className="site-nav">
          <a href="#how">How It Works</a>
          <a href="#routes">The Gate</a>
          <a href="#agents">Agents</a>
          <a href="#memory">Memory</a>
        </nav>
        <a href="/gate" className="btn btn-primary btn-sm">Open the dashboard</a>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="hero">
        <div className="hero-copy">
          <h1 className="display">Autonomy your agents have to earn.</h1>
          <p>
            Four agents work your clients, projects, leads and content from one shared memory.
            Every action they propose goes to a single gate, which weighs what it could cost
            against what that agent has actually got right before.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="/gate" className="btn btn-primary">Open the dashboard</a>
            <Link href="/onboarding" className="btn">
              Set up a business <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <div className="hero-art" style={{ background: 'var(--band-noir)' }}>
          <CatHalftone />
        </div>
      </section>

      <div className="hatch" />

      {/* ---------------- how it works ---------------- */}
      <section className="sec" id="how">
        <div className="sec-head">
          <div className="kicker">How it works</div>
          <h2 className="display">Nothing happens because an agent decided it should.</h2>
          <p className="lede">
            An agent may only ever propose. What becomes of the proposal is settled by stored
            numbers and fixed rules — no model is asked, so the same action with the same history
            is always treated the same way.
          </p>
        </div>

        <div
          className="framed"
          style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
          }}
        >
          <span className="fc-l" />
          <span className="fc-r" />

          <div style={{ padding: 30, borderRight: '1px solid var(--line)' }}>
            <div className="kicker" style={{ marginBottom: 16 }}>01 — Propose</div>
            <div className="stack" style={{ gap: 9 }}>
              {AGENTS.map((a) => (
                <div
                  key={a.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: '1px solid var(--line)', padding: '9px 12px',
                  }}
                >
                  <span style={{ width: 22, height: 22, background: a.tint, flex: '0 0 22px' }} />
                  <span style={{ fontSize: 13.5 }}>{a.name}</span>
                </div>
              ))}
            </div>
            <p className="tiny faint" style={{ marginTop: 16 }}>
              Each cites the recorded facts it relied on.
            </p>
          </div>

          <div style={{ padding: 30, borderRight: '1px solid var(--line)' }}>
            <div className="kicker" style={{ marginBottom: 16 }}>02 — Route</div>
            <div className="stack" style={{ gap: 11 }}>
              <div>
                <div className="tiny faint" style={{ marginBottom: 5 }}>What it could cost</div>
                <div className="bar"><span style={{ width: '62%', background: 'var(--risk-high)' }} /></div>
              </div>
              <div>
                <div className="tiny faint" style={{ marginBottom: 5 }}>What this agent has earned</div>
                <div className="bar"><span style={{ width: '71%', background: 'var(--ink)' }} /></div>
              </div>
              <div
                style={{
                  border: '1px solid var(--line)', padding: '11px 13px', marginTop: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                }}
              >
                0.71 &lt; 0.80 required → ask the owner
              </div>
            </div>
          </div>

          <div style={{ padding: 30 }}>
            <div className="kicker" style={{ marginBottom: 16 }}>03 — Decide</div>
            <div className="stack" style={{ gap: 9 }}>
              <div style={{ border: '1px solid var(--line)', padding: 13 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Reply to Meridian Design Co.</div>
                <div className="tiny faint" style={{ marginTop: 4 }}>3 facts cited · not reversible</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="btn btn-primary btn-sm" style={{ flex: 1 }}>Approve</span>
                <span className="btn btn-danger btn-sm" style={{ flex: 1 }}>Reject</span>
              </div>
              <p className="tiny faint" style={{ margin: '4px 0 0' }}>
                What follows is recorded, and becomes the evidence for next time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="ht-band"><Halftone variant="wave" tone="slate" cols={72} rows={14} fit="xMidYMid slice" /><span className="ht-label">The gate</span></div>

      {/* ---------------- the four routes ---------------- */}
      <section className="sec" id="routes">
        <div
          style={{
            display: 'grid', gap: 40,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
            alignItems: 'start',
          }}
        >
          <div>
            <div className="kicker">The gate</div>
            <h2 className="display">Four ways an action can go.</h2>
          </div>
          <p className="lede" style={{ marginTop: 0 }}>
            Colour in the console means one of two things only: which way the gate sent an action,
            and what that action could cost. Nothing is coloured for decoration.
          </p>
        </div>

        <div
          style={{
            marginTop: 44, display: 'grid', gap: 0,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
            border: '1px solid var(--line)',
          }}
        >
          {ROUTES.map((r) => (
            <div key={r.n} style={{ padding: 26, borderRight: '1px solid var(--line)' }}>
              <span className="dot-m" style={{ background: r.c, width: 11, height: 11, display: 'block', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 9px', fontSize: 17, fontWeight: 600 }}>{r.n}</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.65 }}>{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="hatch" />

      {/* ---------------- the agents ---------------- */}
      <section className="sec" id="agents">
        <div className="sec-head">
          <div className="kicker">Your crew</div>
          <h2 className="display">Meet the four agents.</h2>
          <p className="lede">
            Each one owns a lane and may propose only the kinds of action assigned to it. None of
            them talks to another: everything they know, they know through shared memory.
          </p>
        </div>

        <div
          style={{
            marginTop: 48, display: 'grid', gap: 22,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
          }}
        >
          {AGENTS.map((a) => (
            <div className="tabbed" key={a.name}>
              <span className="tab-label">{a.tab}</span>
              <div className="agent-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <span className="agent-av" style={{ background: a.tint }} aria-hidden="true">
                    {a.name.charAt(0)}
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 21, fontWeight: 600 }}>{a.name}</span>
                    <span className="tiny faint">{a.role}</span>
                  </span>
                </div>
                <div className="kicker" style={{ marginBottom: 12 }}>What does it do?</div>
                <ul className="stack" style={{ gap: 9, margin: 0, paddingLeft: 17, fontSize: 13.5, color: 'var(--ink-dim)' }}>
                  {a.does.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ht-band pale"><Halftone variant="ridge" tone="mono" cols={80} rows={10} fit="xMidYMid slice" /><span className="ht-label">Shared memory</span></div>

      {/* ---------------- memory ---------------- */}
      <section className="sec" id="memory">
        <div className="sec-head">
          <div className="kicker">Memory</div>
          <h2 className="display">How do four agents stay consistent?</h2>
          <p className="lede">
            They never message one another. Every one of them reads the same store of clients,
            projects, team, leads and brand material, and every fact in it records where it came
            from.
          </p>
        </div>

        <div
          style={{
            marginTop: 48, display: 'grid', gap: 48,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
            alignItems: 'start',
          }}
        >
          <div className="rule-list">
            <div>
              <h3>One store, every agent</h3>
              <p>
                Work recorded by one agent reaches another because both read the same memory, not
                because one told the other.
              </p>
            </div>
            <div>
              <h3>Every fact knows its source</h3>
              <p>
                A proposal can always be traced back to the message or record it was formed from,
                which is what you are shown when you are asked to decide.
              </p>
            </div>
            <div>
              <h3>Correct it and the work follows</h3>
              <p>
                Amend a record and any action waiting on the old value is withdrawn and formed
                again from what you have just written.
              </p>
            </div>
          </div>

          <div className="framed" style={{ padding: 30 }}>
            <span className="fc-l" />
            <span className="fc-r" />

            <div style={{ border: '1px solid var(--line)', padding: '14px 16px', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="kicker">Shared memory</span>
                <span
                  className="pill tiny"
                  style={{ marginLeft: 'auto', borderColor: 'var(--route-auto)', color: 'var(--route-auto)' }}
                >
                  Live
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 15 }}>
                Delivery date for “Brand guidelines v2” is 14 October
              </div>
              <div className="fact-src" style={{ marginTop: 6 }}>
                F-2288 · recorded by the owner, 02 Sep
              </div>
            </div>

            <svg viewBox="0 0 440 54" width="100%" height="54" aria-hidden="true">
              <path d="M 220 0 V 20" stroke="#C9C9C9" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <path d="M 74 20 H 366" stroke="#C9C9C9" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <path d="M 74 20 V 50" stroke="#C9C9C9" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <path d="M 220 20 V 50" stroke="#C9C9C9" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <path d="M 366 20 V 50" stroke="#C9C9C9" strokeWidth="1" strokeDasharray="4 4" fill="none" />
            </svg>

            <div
              style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))',
              }}
            >
              {[
                { n: 'Operations', u: 'Answers the client', t: '#DCE0F2' },
                { n: 'Project Mgmt', u: 'Schedules the work', t: '#F7DCD6' },
                { n: 'Marketing', u: 'Will not promise sooner', t: '#D6EDE2' },
              ].map((x) => (
                <div key={x.n} style={{ border: '1px solid var(--line)', padding: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 16, height: 16, background: x.t, flex: '0 0 16px' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{x.n}</span>
                  </div>
                  <div className="tiny faint">{x.u}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 22, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <div className="kicker">Shared context</div>
              <div className="display" style={{ fontSize: 24, marginTop: 7 }}>
                One fact. Three agents. No disagreement.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ht-band tall"><Halftone variant="peak" tone="warm" cols={76} rows={20} fit="xMidYMid slice" /><span className="ht-label">Earned, not configured</span></div>

      {/* ---------------- claim ---------------- */}
      <section className="sec">
        <div
          style={{
            display: 'grid', gap: 44,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
            alignItems: 'start',
          }}
        >
          <div>
            <span className="quote-mark" aria-hidden="true">&ldquo;</span>
            <h2 className="display" style={{ fontSize: 42, maxWidth: '22ch', margin: '14px 0 0' }}>
              Other systems bound what an agent&rsquo;s authority may become. Bizzii measures
              whether it was earned.
            </h2>
          </div>
          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 34 }}>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--ink-dim)', lineHeight: 1.7 }}>
              An agent&rsquo;s score for a kind of action is set lower than the share of its past
              attempts that succeeded, and climbs towards it as the record grows. Three successes
              out of three read 0.53, because three attempts are too few to establish anything.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--ink-dim)', lineHeight: 1.7 }}>
              Whether you approved an action is counted separately from whether it worked. Rejecting
              something because you would rather write it yourself says nothing about the agent, so
              it is not counted against it.
            </p>
            <a href="/gate" className="btn btn-sm">
              See the live measures <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="site-foot">
        <span className="brand-mark" aria-hidden="true">B</span>
        <span>Bizzii — final year project F26-068</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
          <a href="/gate">Dashboard</a>
          <Link href="/onboarding">Setup</Link>
          <a href="/report">Trust report</a>
        </span>
      </footer>
    </div>
  );
}
