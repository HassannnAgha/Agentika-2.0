import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import Halftone from '../../../components/Halftone';

const MESSAGES = [
  { id: '19c4f7b', from: 'ops@averylogistics.pk', subj: 'Site refresh — scope attached', at: '01 Oct 10:22', facts: 3, att: 'avery-scope.pdf · read', ok: true },
  { id: '18f2a9c', from: 'daniyal@meridiandesign.co', subj: 'Board meeting timing', at: '29 Sep 14:12', facts: 2, att: '—', ok: true },
  { id: '19f88b1', from: 'accounts@averylogistics.pk', subj: 'Signed order form', at: '30 Sep 09:50', facts: 0, att: 'order-scan.pdf · not read', ok: false },
  { id: '17b9d2e', from: 'hello@castlebrookdental.pk', subj: 'Quick question on the booking form', at: '18 Sep 11:04', facts: 2, att: '—', ok: true },
  { id: '19a0c33', from: 'rizwan@thorpeandco.com', subj: 'Do you work with clinics?', at: '02 Oct 16:41', facts: 1, att: '—', ok: true, enquiry: true },
];

export default function Memory() {
  return (
    <>
      <Shell
        title="Memory"
        sub="What the agents have read, and what they drew from it"
        right={<span className="pill mono">Last check 09:14 · 4 min ago</span>}
      >
        <div className="content narrow stack">
          <div className="card">
            <div className="ht-strip">
              <Halftone variant="wave" tone="slate" cols={84} rows={9} fit="xMidYMid slice" />
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-k">Messages recorded</div>
                <div className="meta-v num">412</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Facts drawn</div>
                <div className="meta-v num">1,886</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Notification renews</div>
                <div className="meta-v" style={{ fontSize: 14 }}>in 6 days</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Scheduled check</div>
                <div className="meta-v" style={{ fontSize: 14 }}>every 10 min</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Read incompletely</div>
                <div className="meta-v num" style={{ color: 'var(--route-recall)' }}>1</div>
              </div>
            </div>
          </div>

          <div className="notice">
            <span>
              The mailbox is not copied. Each message is held as its identifier at the email
              service together with the facts drawn from it, and a message is recorded against that
              identifier so the same one is never recorded twice.
            </span>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Recently recorded</h2>
              <div className="right"><span className="pill mono">5 of 412</span></div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Received</th><th>From</th><th>Subject</th>
                    <th>Facts</th><th>Attachment</th><th>Identifier</th>
                  </tr>
                </thead>
                <tbody>
                  {MESSAGES.map((m) => (
                    <tr key={m.id} className="clickable">
                      <td className="mono tiny faint" style={{ whiteSpace: 'nowrap' }}>{m.at}</td>
                      <td className="dim mono tiny">{m.from}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{m.subj}</span>
                        {m.enquiry ? (
                          <div className="tiny faint" style={{ marginTop: 3 }}>
                            Sender is not a recorded client — wrote first, so a reply is not
                            unsolicited contact
                          </div>
                        ) : null}
                      </td>
                      <td className="mono dim">{m.facts}</td>
                      <td>
                        {m.att === '—' ? (
                          <span className="faint">—</span>
                        ) : (
                          <span
                            className="pill tiny"
                            style={
                              m.ok
                                ? undefined
                                : { borderColor: 'var(--route-recall)', color: 'var(--route-recall)' }
                            }
                          >
                            {m.att}
                          </span>
                        )}
                      </td>
                      <td className="mono tiny faint">{m.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="notice warn">
            <span>
              <strong>One message carried a file that could not be read.</strong>{' '}
              <span className="mono">order-scan.pdf</span> is a supported document but holds no
              readable text, as a scan does. Its name, type and size are recorded, no reply has been
              proposed to that message, and it needs your attention.
            </span>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.9"
        name="Memory — what the agents have read"
        covers={[
          'UC 4.6.7 Ingest an Incoming Email',
          'UC 4.6.8 Reconcile the Mailbox',
          'UC 4.6.9 Read a File Attached to a Message',
          '§4.4.6 the mailbox is not copied',
        ]}
      />
    </>
  );
}
