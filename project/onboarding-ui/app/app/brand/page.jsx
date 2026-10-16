import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';

const CLAIMS = [
  { c: 'We build booking-led websites for independent practices.', used: 4 },
  { c: 'Most builds run five to seven weeks from first call to launch.', used: 2 },
  { c: 'We work with independent practices and small logistics firms in Lahore.', used: 6 },
];

export default function Brand() {
  return (
    <>
      <Shell
        title="Brand material"
        sub="The voice, positioning and permitted claims the Marketing Agent writes to"
        right={<Link href="/app/marketing" className="btn btn-sm btn-quiet">See drafts</Link>}
      >
        <div className="content narrow stack">
          <div
            style={{
              display: 'grid', gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            <div className="stack">
              <div className="card">
                <div className="card-head"><h2>Voice</h2></div>
                <div className="card-body">
                  <div className="field">
                    <textarea
                      id="voice"
                      aria-label="Voice"
                      defaultValue="Plain and concrete. No superlatives, no filler adjectives. First person plural. Say what was built and what it cost in time; let that do the persuading."
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>Positioning</h2></div>
                <div className="card-body">
                  <div className="field">
                    <textarea
                      id="pos"
                      aria-label="Positioning"
                      defaultValue="A small studio that builds websites and brand material for independent practices and small logistics firms, mostly in Lahore. We take work others would hand to a junior and treat it as the whole job."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <h2>Permitted claims</h2>
                  <div className="right">
                    <button type="button" className="btn btn-sm btn-quiet">Add claim</button>
                  </div>
                </div>
                <table className="data">
                  <thead>
                    <tr><th>Claim</th><th>Used in</th><th /></tr>
                  </thead>
                  <tbody>
                    {CLAIMS.map((c) => (
                      <tr key={c.c}>
                        <td>{c.c}</td>
                        <td className="mono dim">{c.used}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-sm btn-quiet">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="notice warn">
                <span>
                  <strong>A claim not on this list cannot be made.</strong> The Marketing Agent will
                  not write a statement that is not among those permitted, and will state no price
                  or date that is not already recorded as a fact (§4.4.9).
                </span>
              </div>

              <div className="card">
                <div className="card-head"><h2>What this governs</h2></div>
                <div className="card-body">
                  <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                    Every draft the Marketing Agent proposes cites the entries it drew on, and those
                    citations are shown to you beside the draft. Amending an entry here withdraws
                    any draft awaiting your approval that relied on it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.17"
        name="Brand material"
        covers={[
          '§4.2.6 a record of voice, positioning and permitted claims',
          '§4.4.9 no claim outside those permitted',
        ]}
      />
    </>
  );
}
