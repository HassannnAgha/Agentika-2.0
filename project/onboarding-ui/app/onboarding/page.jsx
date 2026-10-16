'use client';

import Frame from '../../components/onboarding/Frame';
import { YesNo } from '../../components/onboarding/fields';
import { useOnboarding } from '../../components/onboarding/state';
import { FIT_QUESTIONS, TEAM_MIN, TEAM_MAX } from './_data/profile';

export default function FitCheck() {
  const { profile, update, reset } = useOnboarding();
  const fit = profile.fit;

  const size = Number(fit.team_size);
  const sizeGiven = String(fit.team_size).trim() !== '';
  const sizeOk = Number.isInteger(size) && size >= TEAM_MIN && size <= TEAM_MAX;
  const unanswered = FIT_QUESTIONS.filter((q) => fit[q.key] == null).length + (sizeGiven ? 0 : 1);
  const failed = FIT_QUESTIONS.filter((q) => fit[q.key] === false).length + (sizeGiven && !sizeOk ? 1 : 0);
  const eligible = unanswered === 0 && failed === 0;

  const started = FIT_QUESTIONS.some((q) => fit[q.key] != null) || sizeGiven || profile.business.name;

  return (
    <Frame
      step={0}
      title="Is Bizzii built for this business?"
      lede="Six conditions the design depends on. Each one is something the agents need in order to act on recorded facts instead of guesses, so a business that fails one is told why before anything is set up (§4.5)."
      readBy={[
        { field: 'All six answers', by: 'nothing after this screen; they decide whether onboarding continues' },
        { field: 'People', by: 'carried into the business profile as team size' },
      ]}
      blocked={
        failed ? 'Bizzii cannot be set up for this business'
          : unanswered ? `Answer ${unanswered === 1 ? 'the last question' : `all ${unanswered} remaining questions`}`
            : null
      }
      art={{ variant: 'wave', tone: 'slate' }}
      anno={{
        fig: '4.8.2a',
        name: 'Onboarding — Fit Check',
        covers: ['UC 4.6.2 Complete Onboarding (precondition)', '§4.5 the kind of business assumed'],
      }}
    >
      <div className="card">
        {FIT_QUESTIONS.map((q) => (
          <div
            key={q.key}
            style={{ padding: '16px 18px', borderBottom: '1px solid var(--line-soft)' }}
            className="stack"
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', fontSize: 14, fontWeight: 500 }}>{q.q}</div>
              <YesNo name={q.key} value={fit[q.key]} onChange={(v) => update('fit', { [q.key]: v })} />
            </div>
            {fit[q.key] === false ? (
              <div className="notice danger" style={{ marginTop: -4 }}>
                <span>{q.why}</span>
              </div>
            ) : null}
          </div>
        ))}

        <div style={{ padding: '16px 18px' }} className="stack">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="team_size" style={{ flex: '1 1 260px', fontSize: 14, fontWeight: 500 }}>
              How many people work in the business, including you?
            </label>
            <div className="field" style={{ width: 110 }}>
              <input
                id="team_size"
                type="number"
                min={1}
                max={50}
                value={fit.team_size}
                onChange={(e) => update('fit', { team_size: e.target.value })}
              />
            </div>
          </div>
          {sizeGiven && !sizeOk ? (
            <div className="notice danger" style={{ marginTop: -4 }}>
              <span>
                Bizzii is designed for {TEAM_MIN} to {TEAM_MAX} people with one owner approving. Fewer
                than {TEAM_MIN} leaves almost nothing to delegate. More than {TEAM_MAX} needs more than
                one approver, and the gate is built around a single approver (Theorem 5.2).
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {eligible ? (
        <div className="notice">
          <span>
            <strong>This business fits.</strong> Next, point us at your website and documents and we
            fill in most of the rest for you to check.
          </span>
        </div>
      ) : null}

      {started ? (
        <div>
          <button
            type="button"
            className="btn btn-sm btn-quiet"
            onClick={() => {
              if (window.confirm('Clear every answer and import and start again?')) reset();
            }}
          >
            Start again
          </button>
        </div>
      ) : null}
    </Frame>
  );
}
