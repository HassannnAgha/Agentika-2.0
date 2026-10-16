import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';

const LEADS = [
  { n: 'Castlebrook Dental', e: 'hello@castlebrookdental.pk', c: 'Dental practice', l: 'Lahore', src: 'Public listing', st: 'In campaign' },
  { n: 'Riverside Orthodontics', e: 'front.desk@riversideortho.pk', c: 'Dental practice', l: 'Lahore', src: 'Public listing', st: 'In campaign' },
  { n: 'Thorpe & Co Clinics', e: 'rizwan@thorpeandco.com', c: 'Clinic group', l: 'Lahore', src: 'Public listing', st: 'Wrote first' },
  { n: 'Gulberg Dental Studio', e: 'info@gulbergdental.pk', c: 'Dental practice', l: 'Lahore', src: 'Public listing', st: 'Not contacted' },
  { n: 'Ayan Family Dentistry', e: 'contact@ayandental.pk', c: 'Dental practice', l: 'Lahore', src: 'Public listing', st: 'Not contacted' },
  { n: 'Meadow Veterinary', e: '—', c: 'Veterinary', l: 'Lahore', src: 'Public listing', st: 'No contact listed' },
];

function Status({ s }) {
  const map = {
    'In campaign': 'var(--route-approve)',
    'Wrote first': 'var(--route-auto)',
    'Not contacted': 'var(--ink-faint)',
    'No contact listed': 'var(--ink-faint)',
  };
  return (
    <span className="pill" style={{ borderColor: map[s], color: map[s] }}>
      <span className="dot-m" style={{ background: map[s] }} />
      {s}
    </span>
  );
}

export default function Leads() {
  return (
    <>
      <Shell
        title="Leads"
        sub="61 recorded · nothing has been sent to any of them"
        right={<button type="button" className="btn btn-sm btn-quiet">Find more leads</button>}
      >
        <div className="content narrow stack">
          <div className="notice">
            <span>
              Recording a lead contacts nobody. Only details a business lists publicly are kept,
              each with the source it was taken from. A lead is written to only under a campaign you
              have approved (§4.2.5).
            </span>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Find businesses</h2>
            </div>
            <div className="card-body">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="cat">Category</label>
                  <input id="cat" defaultValue="Dental practice" />
                </div>
                <div className="field">
                  <label htmlFor="loc">Location</label>
                  <input id="loc" defaultValue="Lahore" />
                </div>
                <div className="field">
                  <label htmlFor="go">&nbsp;</label>
                  <button type="button" className="btn">Search</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Recorded leads</h2>
              <div className="right"><span className="pill mono">6 of 61</span></div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Business</th><th>Contact</th><th>Category</th>
                    <th>Location</th><th>Source</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {LEADS.map((l) => (
                    <tr key={l.n} className="clickable">
                      <td style={{ fontWeight: 500 }}>
                        {l.n}
                        {l.e === '—' ? (
                          <div className="tiny faint" style={{ marginTop: 3 }}>
                            Lists no means of contact — not eligible for outreach
                          </div>
                        ) : null}
                        {l.st === 'Wrote first' ? (
                          <div className="tiny faint" style={{ marginTop: 3 }}>
                            Enquired 02 Oct — a reply is not unsolicited contact
                          </div>
                        ) : null}
                      </td>
                      <td className="dim mono tiny">{l.e}</td>
                      <td className="dim">{l.c}</td>
                      <td className="dim">{l.l}</td>
                      <td className="faint tiny">{l.src}</td>
                      <td><Status s={l.st} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/app/campaigns" className="btn btn-sm btn-primary">Prepare a campaign</Link>
            <Link href="/app/campaigns" className="btn btn-sm btn-quiet">See campaigns</Link>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.14"
        name="Leads"
        covers={[
          'UC 4.6.17 Identify Candidate Leads',
          '§4.2.5 only publicly listed details are recorded',
        ]}
      />
    </>
  );
}
