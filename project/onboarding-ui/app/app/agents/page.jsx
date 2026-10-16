import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';
import Halftone from '../../../components/Halftone';
import { RoutePill, Meter } from '../../../components/bits';

const AGENTS = [
  {
    name: 'Operations Agent',
    classes: [
      { c: 'Record facts from correspondence', s: 96, n: 102, lower: 0.89, req: 0.70, route: 'automatic' },
      { c: 'Reply to a client', s: 16, n: 18, lower: 0.71, req: 0.80, route: 'approval' },
      { c: 'Follow-up to a client', s: 3, n: 3, lower: 0.53, req: 0.75, route: 'approval' },
      { c: 'Flag a client as at risk', s: 9, n: 11, lower: 0.56, req: 0.70, route: 'approval' },
    ],
  },
  {
    name: 'Project Management Agent',
    classes: [
      { c: 'Assign a task', s: 41, n: 44, lower: 0.84, req: 0.75, route: 'automatic' },
      { c: 'Reassign a task', s: 12, n: 14, lower: 0.63, req: 0.75, route: 'recall' },
      { c: 'Create subtasks', s: 22, n: 24, lower: 0.78, req: 0.70, route: 'automatic' },
    ],
  },
  {
    name: 'Sales Agent',
    classes: [
      { c: 'Record a lead', s: 61, n: 64, lower: 0.89, req: 0.60, route: 'automatic' },
      { c: 'Reply to an enquiry', s: 4, n: 6, lower: 0.36, req: 0.80, route: 'approval' },
      { c: 'Outreach campaign', s: 2, n: 3, lower: 0.21, req: null, route: 'escalation' },
    ],
  },
  {
    name: 'Marketing Agent',
    classes: [{ c: 'Draft content', s: 7, n: 9, lower: 0.51, req: 0.70, route: 'approval' }],
  },
];

export default function Agents() {
  return (
    <>
      <Shell
        active="agents"
        title="Agents"
        sub="What each agent has earned, for each kind of action"
      >
        <div className="content narrow stack">
          <div className="card">
            <div className="ht-strip">
              <Halftone variant="peak" tone="mono" cols={88} rows={9} fit="xMidYMid slice" />
            </div>
            <div className="card-body">
              <p className="dim" style={{ margin: 0, fontSize: 14 }}>
                Competence is the lowest success rate the recorded outcomes can be relied on to
                support, not the rate those outcomes show. Three successes out of three therefore
                read 0.53, three attempts being too few to establish competence (§4.3, §4.4.3).
              </p>
            </div>
          </div>

          {AGENTS.map((a) => (
            <div className="card" key={a.name}>
              <div className="card-head"><h2>{a.name}</h2></div>
              <div className="table-scroll">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Action class</th>
                      <th style={{ width: 170 }}>Competence</th>
                      <th>Raw</th>
                      <th>Outcomes</th>
                      <th>Required</th>
                      <th>Route earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.classes.map((k) => (
                      <tr key={k.c}>
                        <td style={{ fontWeight: 500 }}>{k.c}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="mono" style={{ minWidth: 34 }}>{k.lower.toFixed(2)}</span>
                            <span style={{ flex: 1 }}>
                              <Meter
                                value={k.lower}
                                color={k.req != null && k.lower >= k.req ? 'var(--route-auto)' : 'var(--ink)'}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="mono dim">{(k.s / k.n).toFixed(2)}</td>
                        <td className="mono dim">{k.s} / {k.n}</td>
                        <td className="mono faint">{k.req != null ? k.req.toFixed(2) : '—'}</td>
                        <td><RoutePill route={k.route} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="tiny faint" style={{ margin: 0 }}>
            “Outreach campaign” shows no required level because it is held under a rule fixed in the
            system and never advances, however competent the agent becomes (§4.2.2).
          </p>
        </div>
      </Shell>

      <Anno
        fig="4.8.10"
        name="Agent Competence"
        covers={[
          '§4.2.2 routing on risk and demonstrated competence',
          '§4.4.3 a separate score per agent and per action class',
          '§4.3 Soundness of the Trust Estimate',
        ]}
      />
    </>
  );
}
