'use client';

import Frame, { SourceChip } from '../../../components/onboarding/Frame';
import { CustomFields, DropZone, ProjectList, TagInput } from '../../../components/onboarding/fields';
import { useImporter } from '../../../components/onboarding/importer';
import { nextId, useOnboarding } from '../../../components/onboarding/state';

export default function TeamMembers() {
  const { profile, update } = useOnboarding();
  const { importFiles } = useImporter();
  const team = profile.team;

  // editing a row is the owner vouching for it
  const setRow = (id, patch) =>
    update('team', team.map((m) => (m.id === id ? { ...m, ...patch, confirmed: true } : m)));
  const add = () =>
    update('team', [
      ...team,
      {
        id: nextId('tm', team), name: '', role: '', email: '', skills: [], capacity: 40, experience: '', summary: '',
        projects: [], custom: [], source: null, confirmed: true,
      },
    ]);
  const remove = (id) => update('team', team.filter((m) => m.id !== id));

  const reading = profile.imports.files.filter((f) => f.status === 'reading').length;

  let blocked = null;
  if (reading) blocked = 'Still reading CVs';
  else if (!team.length) blocked = 'Record at least one team member';
  else if (team.some((m) => !m.name.trim())) blocked = 'Every team member needs a name';
  else if (team.some((m) => !m.skills.length)) blocked = 'Every team member needs at least one skill';

  const hours = team.reduce((s, m) => s + (Number(m.capacity) || 0), 0);

  return (
    <Frame
      step={3}
      screen="team"
      title="Who does the work?"
      lede="Nobody listed here gets an account. They receive work in the task management tool, and the Project Management Agent proposes who should take each task from what you record here (§4.4.6)."
      readBy={[
        { field: 'Skills', by: 'Project Management Agent, to choose who a subtask goes to' },
        { field: 'Weekly capacity', by: 'Project Management Agent, so nobody is assigned past their hours' },
        { field: 'Email', by: 'the gate, which marks them a teammate when an action reaches them' },
        { field: 'Previous projects', by: 'Project Management Agent, as evidence for who has done similar work' },
        { field: 'Role, experience', by: 'shown beside every proposed assignment' },
      ]}
      blocked={blocked}
      art={{ variant: 'ridge', tone: 'mono' }}
      anno={{
        fig: '4.8.2b',
        name: 'Onboarding — Team',
        covers: ['UC 4.6.2 Complete Onboarding (step 5)', '§4.2.7 team members with skills and roles', 'PM-3 skill profiles seeded at onboarding'],
      }}
    >
      {team.map((m, i) => (
        <div className="card" key={m.id}>
          <div className="card-head">
            <h2>{m.name.trim() || `Team member ${i + 1}`}</h2>
            <SourceChip source={m.source} confirmed={m.confirmed} />
            <div className="right">
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => remove(m.id)}>Remove</button>
            </div>
          </div>
          <div className="card-body stack" style={{ gap: 14 }}>
            {m.summary ? <p className="tiny faint" style={{ margin: 0 }}>{m.summary}</p> : null}
            <div className="field-row">
              <div className="field">
                <label htmlFor={`${m.id}-n`}>Name</label>
                <input id={`${m.id}-n`} value={m.name} onChange={(e) => setRow(m.id, { name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor={`${m.id}-r`}>Role</label>
                <input id={`${m.id}-r`} value={m.role} onChange={(e) => setRow(m.id, { role: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${m.id}-s`}>Skills</label>
              <TagInput id={`${m.id}-s`} value={m.skills} onChange={(skills) => setRow(m.id, { skills })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor={`${m.id}-e`}>Email</label>
                <input id={`${m.id}-e`} type="email" value={m.email} onChange={(e) => setRow(m.id, { email: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor={`${m.id}-x`}>Years of experience</label>
                <input
                  id={`${m.id}-x`}
                  type="number"
                  min={0}
                  max={60}
                  value={m.experience}
                  onChange={(e) => setRow(m.id, { experience: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor={`${m.id}-c`}>Weekly capacity, hours</label>
                <input
                  id={`${m.id}-c`}
                  type="number"
                  min={0}
                  max={80}
                  value={m.capacity}
                  onChange={(e) => setRow(m.id, { capacity: e.target.value })}
                />
              </div>
            </div>

            <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Previous projects</div>
                <div className="tiny faint" style={{ marginTop: 2 }}>
                  Past work the Project Management Agent can point to when it proposes this person for a similar task.
                </div>
              </div>
              <ProjectList idPrefix="pj" items={m.projects ?? []} onChange={(projects) => setRow(m.id, { projects })} />
            </div>

            <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
              <CustomFields
                idPrefix="tf"
                title={`Anything else about ${m.name.trim().split(' ')[0] || 'them'}`}
                hint="e.g. certifications, languages, days they are out, tools they own."
                labelPlaceholder="e.g. Languages"
                valuePlaceholder="e.g. English, Urdu, Punjabi"
                items={m.custom ?? []}
                onChange={(custom) => setRow(m.id, { custom })}
              />
            </div>
          </div>
        </div>
      ))}

      <DropZone onFiles={importFiles} accept=".pdf,.docx,.txt" compact>
        <span style={{ fontWeight: 500 }}>{reading ? `Reading ${reading} CV${reading === 1 ? '' : 's'}…` : 'Add people from their CVs'}</span>
        <span className="tiny faint">Drop one or several (PDF or Word). Each becomes a team member to check.</span>
      </DropZone>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={add}>Add team member by hand</button>
        <span className="tiny faint mono">
          {team.length} {team.length === 1 ? 'person' : 'people'} · {hours} hours a week
        </span>
      </div>
      {team.some((m) => m.source && m.capacity === 40 && !m.confirmed) ? (
        <p className="tiny faint" style={{ margin: 0 }}>
          Capacity is set to 40 hours for imported people. CVs do not say how much time someone has for
          this business, so adjust it.
        </p>
      ) : null}
    </Frame>
  );
}
