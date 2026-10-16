import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';

const SENT = [
  { n: 'Castlebrook Dental', at: '06 Oct 09:12', st: 'Sent' },
  { n: 'Riverside Orthodontics', at: '06 Oct 09:14', st: 'Sent' },
  { n: 'Thorpe & Co Clinics', at: '—', st: 'Withheld' },
  { n: 'Gulberg Dental Studio', at: '—', st: 'Queued' },
];

export default function Campaigns() {
  return (
    <>
      <Shell
        title="Campaigns"
        sub="One approved and running, one waiting on you"
        right={<Link href="/app/escalated" className="btn btn-sm btn-primary">Review the waiting one</Link>}
      >
        <div className="content narrow stack">
          <div className="card">
            <div className="card-head">
              <h2>Awaiting your approval</h2>
              <div className="right">
                <span className="pill" style={{ borderColor: 'var(--route-escalate)', color: 'var(--route-escalate)' }}>
                  <span className="dot-m" style={{ background: 'var(--route-escalate)' }} />
                  Escalated
                </span>
              </div>
            </div>
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
                <div className="meta-k">Held by</div>
                <div className="meta-v" style={{ fontSize: 14 }}>Unsolicited contact</div>
              </div>
            </div>
            <div className="card-body">
              <p className="tiny faint" style={{ margin: 0 }}>
                Contacting a prospect who has not written first always requires your approval,
                however competent the Sales Agent becomes.{' '}
                <Link href="/app/escalated" style={{ textDecoration: 'underline' }}>Open the campaign</Link>
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Running — Dental practices, Lahore</h2>
              <div className="right">
                <span className="pill mono">approved 05 Oct</span>
                <span className="pill mono">closes 17 Oct</span>
              </div>
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-k">On the approved list</div>
                <div className="meta-v num">18</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Sent</div>
                <div className="meta-v num">11</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Withheld</div>
                <div className="meta-v num">1</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Replied</div>
                <div className="meta-v num">3</div>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr><th>Lead</th><th>Sent at</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {SENT.map((s) => (
                    <tr key={s.n}>
                      <td style={{ fontWeight: 500 }}>
                        {s.n}
                        {s.st === 'Withheld' ? (
                          <div className="tiny faint" style={{ marginTop: 3 }}>
                            Replied before the message was sent — a reply was proposed instead
                          </div>
                        ) : null}
                      </td>
                      <td className="mono tiny faint">{s.at}</td>
                      <td>
                        <span
                          className="pill"
                          style={
                            s.st === 'Withheld'
                              ? { borderColor: 'var(--route-recall)', color: 'var(--route-recall)' }
                              : undefined
                          }
                        >
                          {s.st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-body">
              <p className="tiny faint" style={{ margin: 0 }}>
                No message goes to a lead who is not on the approved list, nor after 17 October.
                Adding a lead means submitting a new campaign, not editing this one.
              </p>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.15"
        name="Campaigns"
        covers={[
          'UC 4.6.18 Prepare an Outreach Campaign',
          'UC 4.6.20 Send the Messages of an Approved Campaign',
          '§4.2.5 a fixed list, one message form, one period',
        ]}
      />
    </>
  );
}
