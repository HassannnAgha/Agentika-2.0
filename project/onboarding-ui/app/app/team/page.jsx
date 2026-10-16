import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';

const TEAM = [
  { n: 'Sana Qureshi', r: 'Designer', e: 'sana@northlinestudio.com', skills: ['Illustration', 'Asset preparation', 'Layout'], open: 2, done: 31, tint: '#F7DCD6' },
  { n: 'Imran Shah', r: 'Writer and front-end', e: 'imran@northlinestudio.com', skills: ['Copywriting', 'Long-form content', 'HTML/CSS'], open: 3, done: 44, tint: '#DCE0F2' },
  { n: 'Hira Baig', r: 'Developer', e: 'hira@northlinestudio.com', skills: ['React', 'Integrations', 'Forms'], open: 2, done: 28, tint: '#D6EDE2' },
  { n: 'Omar Siddiqui', r: 'Project coordinator', e: 'omar@northlinestudio.com', skills: ['Scheduling', 'Client liaison'], open: 1, done: 19, tint: '#FBEACB' },
  { n: 'Zara Khan', r: 'Designer', e: 'zara@northlinestudio.com', skills: ['Brand systems', 'Typography'], open: 0, done: 12, tint: '#E8DCF2' },
];

export default function Team() {
  return (
    <>
      <Shell
        title="Team"
        sub="5 people · assignments are proposed from these records"
        right={<button type="button" className="btn btn-sm btn-quiet">Add member</button>}
      >
        <div className="content narrow stack">
          <div className="notice">
            <span>
              Recorded skills and previously completed work are the only basis on which the Project
              Management Agent proposes an assignee, and it states which of them it used. Nobody
              here holds an account — they receive work in the task management tool (§4.4.6).
            </span>
          </div>

          <div
            style={{
              display: 'grid', gap: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
            }}
          >
            {TEAM.map((m) => (
              <div className="card" key={m.n}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
                    <span
                      className="agent-av"
                      style={{ background: m.tint, width: 46, height: 46, fontSize: 20 }}
                      aria-hidden="true"
                    >
                      {m.n.charAt(0)}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>{m.n}</span>
                      <span className="tiny faint">{m.r}</span>
                    </span>
                  </div>

                  <div className="kicker" style={{ marginBottom: 9 }}>Recorded skills</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
                    {m.skills.map((s) => (
                      <span className="pill" key={s}>{s}</span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex', gap: 22, borderTop: '1px solid var(--line-soft)',
                      paddingTop: 14,
                    }}
                  >
                    <span>
                      <span className="meta-k">Open</span>
                      <span className="mono" style={{ fontSize: 17 }}>{m.open}</span>
                    </span>
                    <span>
                      <span className="meta-k">Completed</span>
                      <span className="mono" style={{ fontSize: 17 }}>{m.done}</span>
                    </span>
                    <span style={{ marginLeft: 'auto', alignSelf: 'end' }}>
                      <button type="button" className="btn btn-sm btn-quiet">Amend</button>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.13"
        name="Team"
        covers={[
          '§4.2.7 the owner records team members with skills and roles',
          'UC 4.6.14 the basis on which an assignee is proposed',
        ]}
      />
    </>
  );
}
