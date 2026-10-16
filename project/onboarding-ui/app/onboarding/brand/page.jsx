'use client';

import Frame, { FieldLabel } from '../../../components/onboarding/Frame';
import { CustomFields, ListEditor } from '../../../components/onboarding/fields';
import { nextId, useOnboarding } from '../../../components/onboarding/state';
import { COMMON_PROHIBITED } from '../_data/profile';

export default function BrandMaterial() {
  const { profile, update, setField } = useOnboarding();
  const br = profile.brand;
  const set = (patch) => update('brand', patch);

  const hasCommon = (t) => br.prohibited.some((x) => x.text === t);
  const toggleCommon = (t) =>
    set({
      prohibited: hasCommon(t)
        ? br.prohibited.filter((x) => x.text !== t)
        : [
            ...br.prohibited,
            // own prefix, so ids never collide with the free-text rows below
            { id: nextId('xd', br.prohibited.filter((x) => x.id.startsWith('xd'))), text: t, quote: '', source: null, confirmed: true },
          ],
    });

  let blocked = null;
  if (!br.voice.trim()) blocked = 'Describe the voice';
  else if (!br.positioning.trim()) blocked = 'State the positioning';
  else if (!br.permitted.some((c) => c.text.trim())) blocked = 'Record at least one permitted claim';

  const ownProhibited = br.prohibited.filter((x) => !COMMON_PROHIBITED.includes(x.text));

  return (
    <Frame
      step={5}
      screen="brand"
      title="How should the business sound?"
      lede="The Marketing Agent writes to what is recorded here and nothing else. A claim not on the permitted list cannot be made, and one on the prohibited list is refused before you ever see it (§4.4.9)."
      readBy={[
        { field: 'Voice', by: 'Marketing Agent, for tone and register' },
        { field: 'Positioning', by: 'Marketing and Sales Agents, as a business fact they may cite' },
        { field: 'Permitted claims', by: 'the guardrail — every claim in a draft must be on this list' },
        { field: 'Prohibited claims', by: 'the guardrail — a draft making any of these is refused' },
      ]}
      blocked={blocked}
      art={{ variant: 'terrain', tone: 'warm' }}
      anno={{
        fig: '4.8.2d',
        name: 'Onboarding — Brand Material',
        covers: ['UC 4.6.2 Complete Onboarding (step 7)', '§4.2.6 voice, positioning and permitted claims', '§4.4.9 no claim outside those permitted'],
      }}
    >
      <div className="card">
        <div className="card-body stack" style={{ gap: 16 }}>
          <div className="field">
            <FieldLabel htmlFor="voice" path="brand.voice">Voice</FieldLabel>
            <textarea
              id="voice"
              placeholder="How you write: tone, person, what you avoid"
              value={br.voice}
              onChange={(e) => setField('brand.voice', e.target.value)}
            />
          </div>
          <div className="field">
            <FieldLabel htmlFor="pos" path="brand.positioning">Positioning statement</FieldLabel>
            <textarea
              id="pos"
              placeholder="Who you are for, and why them"
              value={br.positioning}
              onChange={(e) => setField('brand.positioning', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Permitted claims</h2></div>
        <div className="card-body stack" style={{ gap: 12 }}>
          {br.permitted.some((c) => c.source) ? (
            <p className="tiny faint" style={{ margin: 0 }}>
              These are claims your own material already makes, with the words that support each one.
              Keep the ones you stand behind.
            </p>
          ) : null}
          <ListEditor
            label="Permitted claim"
            idPrefix="pc"
            items={br.permitted}
            onChange={(permitted) => set({ permitted })}
            addLabel="Add claim"
            placeholder="A statement the agents may make"
            empty="No claims yet. Add the factual statements you are happy for the agents to make."
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Prohibited claims</h2></div>
        <div className="card-body stack" style={{ gap: 14 }}>
          <div className="radio-list">
            {COMMON_PROHIBITED.map((t) => (
              <label className="radio-row" key={t}>
                <input type="checkbox" checked={hasCommon(t)} onChange={() => toggleCommon(t)} />
                <span className="rl-title" style={{ fontWeight: 400 }}>{t}</span>
              </label>
            ))}
          </div>
          <ListEditor
            label="Prohibited claim"
            idPrefix="xc"
            items={ownProhibited}
            onChange={(rows) => set({ prohibited: [...br.prohibited.filter((x) => COMMON_PROHIBITED.includes(x.text)), ...rows] })}
            addLabel="Add"
            placeholder="A statement the agents must never make"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <CustomFields
            idPrefix="gf"
            title="Other brand guidance"
            hint="Anything else the Marketing Agent should follow, e.g. words to avoid, sign-off, how to refer to the business."
            labelPlaceholder="e.g. Sign-off"
            valuePlaceholder="e.g. Warmly, the Saffron Pixel team"
            items={br.custom ?? []}
            onChange={(custom) => set({ custom })}
          />
        </div>
      </div>

      <div className="notice warn">
        <span>
          <strong>Prices and dates are never claims.</strong> Whatever this list says, no agent will
          state a price or date that is not already recorded as a fact.
        </span>
      </div>
    </Frame>
  );
}
