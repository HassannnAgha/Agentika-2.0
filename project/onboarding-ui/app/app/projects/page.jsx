import Link from 'next/link';
import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import { Evidence } from '../../../components/bits';

const PROJECTS = [
  { n: 'Avery Logistics — site refresh', c: 'Avery Logistics', s: 'Awaiting confirmation', tasks: '—', due: '14 Nov', pending: true },
  { n: 'Meridian — brand guidelines v2', c: 'Meridian Design Co.', s: 'Confirmed', tasks: '4 of 6 done', due: '14 Oct' },
  { n: 'Castlebrook — site build', c: 'Castlebrook Dental', s: 'Confirmed', tasks: '8 of 8 done', due: '27 Sep' },
  { n: 'Harbour & Fin — print set', c: 'Harbour & Fin', s: 'Declined', tasks: '—', due: '—' },
];

const FACTS = [
  {
    id: 'F-2312',
    statement:
      'Avery Logistics agreed to a site refresh covering the homepage, three service pages and a contact form.',
    source: 'Message 19c4f7b · received 01 Oct 10:22',
  },
  {
    id: 'F-2313',
    statement: 'The scope document names 14 November as the date the refresh is wanted by.',
    source: 'Attachment “avery-scope.pdf” · read 01 Oct 10:24',
  },
];

const SUBTASKS = [
  'Audit the existing site and record what carries over',
  'Homepage wireframe and copy',
  'Three service pages — copy and layout',
  'Contact form and submission handling',
  'Responsive pass at phone and tablet widths',
  'Launch checklist and handover',
];

function Status({ s }) {
  const map = {
    Confirmed: 'var(--route-auto)',
    'Awaiting confirmation': 'var(--route-recall)',
    Declined: 'var(--ink-faint)',
  };
  return (
    <span className="pill" style={{ borderColor: map[s], color: map[s] }}>
      <span className="dot-m" style={{ background: map[s] }} />
      {s}
    </span>
  );
}

export default function Projects() {
  return (
    <>
      <Shell title="Projects" sub="3 live · 1 waiting on your confirmation">
        <div className="content narrow stack">
          <div className="card">
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr><th>Project</th><th>Client</th><th>Tasks</th><th>Wanted by</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {PROJECTS.map((p) => (
                    <tr key={p.n} className="clickable">
                      <td style={{ fontWeight: 500 }}>
                        {p.n}
                        {p.pending ? (
                          <div className="tiny faint" style={{ marginTop: 3 }}>
                            Identified from correspondence — no work has begun
                          </div>
                        ) : null}
                      </td>
                      <td className="dim">{p.c}</td>
                      <td className="dim tiny">{p.tasks}</td>
                      <td className="mono tiny faint">{p.due}</td>
                      <td><Status s={p.s} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="notice warn">
            <span>
              <strong>Nothing has begun on the Avery Logistics refresh.</strong> The system does not
              break a project into subtasks or propose assignments until you confirm it.
            </span>
          </div>

          <div
            style={{
              display: 'grid', gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            <div className="card">
              <div className="card-head"><h2>Avery Logistics — site refresh</h2></div>
              <div className="meta-grid">
                <div className="meta-cell">
                  <div className="meta-k">Client</div>
                  <div className="meta-v" style={{ fontSize: 14 }}>Avery Logistics</div>
                </div>
                <div className="meta-cell">
                  <div className="meta-k">Wanted by</div>
                  <div className="meta-v" style={{ fontSize: 14 }}>14 Nov</div>
                </div>
                <div className="meta-cell">
                  <div className="meta-k">Identified</div>
                  <div className="meta-v" style={{ fontSize: 14 }}>01 Oct</div>
                </div>
              </div>
              <div className="card-body stack" style={{ gap: 15 }}>
                <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                  A refresh of the existing site covering the homepage, three service pages and a
                  contact form, drawn from the correspondence and the attached scope document.
                </p>
                <Evidence facts={FACTS} />
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <h2>Subtasks that would be formed</h2>
                  <div className="right"><span className="pill mono">6</span></div>
                </div>
                <div className="card-body">
                  <ol className="stack" style={{ gap: 9, margin: 0, paddingLeft: 20, fontSize: 14 }}>
                    {SUBTASKS.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                  <p className="tiny faint" style={{ margin: '14px 0 0' }}>
                    Each subtask and each proposed assignee goes to the gate separately once you
                    confirm.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h2>Decide</h2></div>
                <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/app/tasks" className="btn btn-primary" style={{ flex: '1 1 150px' }}>
                    Confirm project
                  </Link>
                  <Link href="/app/queue" className="btn btn-danger" style={{ flex: '1 1 150px' }}>
                    Decline
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.11"
        name="Projects"
        covers={[
          'UC 4.6.13 Start a Project',
          '§4.2.4 no work begins on an unconfirmed project',
        ]}
      />
    </>
  );
}
