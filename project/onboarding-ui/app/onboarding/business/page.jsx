'use client';

import Frame, { FieldLabel } from '../../../components/onboarding/Frame';
import { CustomFields } from '../../../components/onboarding/fields';
import { useOnboarding } from '../../../components/onboarding/state';
import { TIMEZONES, WEEKDAYS } from '../_data/profile';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BusinessProfile() {
  const { profile, update, setField } = useOnboarding();
  const b = profile.business;
  const bind = (field) => ({ value: b[field], onChange: (e) => setField(`business.${field}`, e.target.value) });

  const toggleDay = (d) =>
    update('business', {
      working_days: b.working_days.includes(d)
        ? b.working_days.filter((x) => x !== d)
        : WEEKDAYS.filter((x) => x === d || b.working_days.includes(x)),
    });

  let blocked = null;
  if (!b.name.trim()) blocked = 'Give the business a name';
  else if (!b.owner_name.trim()) blocked = 'Give the approver’s name';
  else if (!EMAIL.test(b.owner_email)) blocked = 'The approver needs a valid email address';
  else if (!b.working_days.length) blocked = 'Pick at least one working day';
  else if (b.hours_start >= b.hours_end) blocked = 'The working day must end after it starts';

  const timezones = TIMEZONES.includes(b.timezone) ? TIMEZONES : [b.timezone, ...TIMEZONES];

  return (
    <Frame
      step={2}
      screen="business"
      title="Tell us about the business"
      lede="What you record here is taken as true. The agents never check it against an outside source, so anything agreed by phone or in person has to be entered by you (§4.5)."
      readBy={[
        { field: 'Description', by: 'Marketing Agent, as recorded positioning' },
        { field: 'Timezone, days and hours', by: 'the gate, for the day boundary behind per-agent daily limits and the queue' },
        { field: 'Owner email', by: 'every route that asks the owner; the only approver the gate knows' },
        { field: 'Category', by: 'Sales Agent, to score a prospect’s fit' },
      ]}
      blocked={blocked}
      anno={{
        fig: '4.8.2',
        name: 'Onboarding — Business Profile',
        covers: ['UC 4.6.2 Complete Onboarding (steps 1–4)', '§4.2.7 the owner records the business profile'],
      }}
    >
      <div className="card">
        <div className="card-body stack" style={{ gap: 16 }}>
          <div className="field">
            <FieldLabel htmlFor="bn" path="business.name">Business name</FieldLabel>
            <input id="bn" {...bind('name')} />
          </div>
          <div className="field-row">
            <div className="field">
              <FieldLabel htmlFor="cat" path="business.category">Category</FieldLabel>
              <input id="cat" placeholder="e.g. Design and web studio" {...bind('category')} />
            </div>
            <div className="field">
              <label htmlFor="size">People</label>
              <input
                id="size"
                type="number"
                min={3}
                max={8}
                value={profile.fit.team_size}
                onChange={(e) => update('fit', { team_size: e.target.value })}
              />
              <span className="hint">Including you. Checked on the first screen.</span>
            </div>
          </div>
          <div className="field">
            <FieldLabel htmlFor="desc" path="business.description">What the business does</FieldLabel>
            <textarea id="desc" placeholder="Who you work for and what you deliver" {...bind('description')} />
            <span className="hint">Used by the Marketing Agent as recorded positioning.</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Working week</h2></div>
        <div className="card-body stack" style={{ gap: 16 }}>
          <div className="field">
            <FieldLabel htmlFor="tz" path="business.timezone">Timezone</FieldLabel>
            <select id="tz" {...bind('timezone')}>
              {timezones.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <span style={{ fontSize: 13, fontWeight: 500 }}>Working days</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {WEEKDAYS.map((d) => {
                const on = b.working_days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(d)}
                    className={`btn btn-sm ${on ? 'btn-primary' : 'btn-quiet'}`}
                    style={{ minWidth: 56 }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="hs">Day starts</label>
              <input id="hs" type="time" value={b.hours_start} onChange={(e) => update('business', { hours_start: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="he">Day ends</label>
              <input id="he" type="time" value={b.hours_end} onChange={(e) => update('business', { hours_end: e.target.value })} />
            </div>
          </div>
          <span className="tiny faint">
            Daily limits on each agent reset, and the approval queue is reviewed, against this working
            day.
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>The owner</h2></div>
        <div className="card-body stack" style={{ gap: 16 }}>
          <div className="field-row">
            <div className="field">
              <FieldLabel htmlFor="on" path="business.owner_name">Your name</FieldLabel>
              <input id="on" {...bind('owner_name')} />
            </div>
            <div className="field">
              <FieldLabel htmlFor="oe" path="business.owner_email">Your email — the single approver</FieldLabel>
              <input id="oe" type="email" {...bind('owner_email')} />
            </div>
          </div>
          {profile.provenance['business.owner_email']?.source && !profile.provenance['business.owner_email'].confirmed ? (
            <span className="tiny faint">
              This was the contact address on your website. Change it if approvals should go to you personally.
            </span>
          ) : null}
          <div className="notice">
            <span>
              <strong>One approver, by design.</strong> Every action the agents have not earned the
              right to take comes to this address and no other. Trust is measured against one
              person&rsquo;s decisions, and splitting them across several approvers would make that
              measure meaningless (Theorem 5.2).
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <CustomFields
            idPrefix="bf"
            title="Anything else about the business"
            hint="Recorded as business facts the agents may cite, e.g. payment terms, languages you work in, areas you serve."
            labelPlaceholder="e.g. Payment terms"
            valuePlaceholder="e.g. 50% upfront, rest on launch"
            items={b.custom ?? []}
            onChange={(custom) => update('business', { custom })}
          />
        </div>
      </div>
    </Frame>
  );
}
