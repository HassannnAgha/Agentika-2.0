import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { Evidence } from '../../../components/bits';

const CLIENTS = [
  { n: 'Meridian Design Co.', e: 'daniyal@meridiandesign.co', s: 'Active', last: '29 Sep', proj: 1, open: 2 },
  { n: 'Avery Logistics', e: 'ops@averylogistics.pk', s: 'Active', last: '01 Oct', proj: 1, open: 0 },
  { n: 'Castlebrook Dental', e: 'hello@castlebrookdental.pk', s: 'At risk', last: '18 Sep', proj: 1, open: 1 },
  { n: 'Harbour & Fin', e: 'studio@harbourandfin.com', s: 'Active', last: '24 Sep', proj: 0, open: 1 },
];

const RISK_FACTS = [
  {
    id: 'F-2255',
    statement: 'A question about the booking form was asked on 18 September and has had no reply.',
    source: 'Message 17b9d2e · received 18 Sep 11:04',
  },
  {
    id: 'F-2259',
    statement: 'A commitment to send revised copy by 26 September passed without the copy being sent.',
    source: 'Message 18a1f40 · recorded 12 Sep',
  },
  {
    id: 'F-2301',
    statement: 'The last three messages from this client are shorter than the thread average and ask no questions.',
    source: 'Thread 4471 · analysed 02 Oct',
  },
];

export default function Clients() {
  return (
    <>
      <Shell
        title="Clients"
        sub="4 recorded · 1 at risk"
        right={<button type="button" className="btn btn-sm btn-quiet">Add client</button>}
      >
        <div className="content narrow stack">
          <div className="card">
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Client</th><th>Contact</th><th>Last heard</th>
                    <th>Projects</th><th>Open threads</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {CLIENTS.map((c) => (
                    <tr key={c.n} className="clickable">
                      <td style={{ fontWeight: 500 }}>{c.n}</td>
                      <td className="dim mono tiny">{c.e}</td>
                      <td className="dim">{c.last}</td>
                      <td className="mono dim">{c.proj}</td>
                      <td className="mono dim">{c.open}</td>
                      <td>
                        <span
                          className="pill"
                          style={
                            c.s === 'At risk'
                              ? { borderColor: 'var(--route-escalate)', color: 'var(--route-escalate)' }
                              : undefined
                          }
                        >
                          {c.s === 'At risk' ? (
                            <span className="dot-m" style={{ background: 'var(--route-escalate)' }} />
                          ) : null}
                          {c.s}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              display: 'grid', gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            {/* --- why this client was flagged --- */}
            <div className="card">
              <div className="card-head">
                <h2>Castlebrook Dental — flagged at risk</h2>
                <div className="right">
                  <span className="pill" style={{ borderColor: 'var(--route-escalate)', color: 'var(--route-escalate)' }}>
                    <span className="dot-m" style={{ background: 'var(--route-escalate)' }} />
                    At risk
                  </span>
                </div>
              </div>
              <div className="card-body stack" style={{ gap: 15 }}>
                <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                  The Operations Agent flagged this relationship on 02 October. The judgement rests
                  on the recorded facts below and on nothing else.
                </p>
                <Evidence facts={RISK_FACTS} />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/app/queue" className="btn btn-sm btn-primary">Draft a reply</Link>
                  <button type="button" className="btn btn-sm btn-quiet">Clear the flag</button>
                </div>
              </div>
            </div>

            {/* --- amend --- */}
            <div className="card">
              <div className="card-head"><h2>Amend — Meridian Design Co.</h2></div>
              <div className="card-body stack" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="cname">Client name</label>
                  <input id="cname" defaultValue="Meridian Design Co." />
                </div>
                <div className="field">
                  <label htmlFor="cmail">Contact address</label>
                  <input id="cmail" defaultValue="daniyal@meridiandesign.co" />
                  <span className="hint">Agents may write only to an address already on record.</span>
                </div>
                <div className="field">
                  <label htmlFor="cstatus">Status</label>
                  <select id="cstatus" defaultValue="Active">
                    <option>Active</option><option>At risk</option><option>Dormant</option>
                  </select>
                </div>

                <div className="notice warn">
                  <span>
                    <strong>One action awaiting approval was formed from this record.</strong>{' '}
                    A-4465, the reply to Meridian Design Co., will be withdrawn and formed again
                    from the amended record.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/app/queue" className="btn btn-primary" style={{ flex: '1 1 150px' }}>
                    Save amendment
                  </Link>
                  <button type="button" className="btn btn-quiet" style={{ flex: '1 1 110px' }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.8"
        name="Clients"
        covers={[
          'UC 4.6.10 Identify a Client at Risk',
          'UC 4.6.5 Amend a Business Record',
          '§4.2.1 shared business memory',
        ]}
      />
    </>
  );
}
