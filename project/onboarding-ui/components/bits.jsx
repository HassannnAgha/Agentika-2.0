/* Small presentational pieces shared across the screens. */

const ROUTE = {
  automatic: { label: 'Automatic', color: 'var(--route-auto)', tint: 'var(--tint-auto)' },
  recall: { label: 'Recall window', color: 'var(--route-recall)', tint: 'var(--tint-recall)' },
  approval: { label: 'Owner approval', color: 'var(--route-approve)', tint: 'var(--tint-approve)' },
  escalation: { label: 'Escalated', color: 'var(--route-escalate)', tint: 'var(--tint-escalate)' },
};

const RISK = {
  low: { label: 'Low', color: 'var(--risk-low)' },
  moderate: { label: 'Moderate', color: 'var(--risk-moderate)' },
  high: { label: 'High', color: 'var(--risk-high)' },
  critical: { label: 'Critical', color: 'var(--risk-critical)' },
};

export function RoutePill({ route }) {
  const r = ROUTE[route];
  return (
    <span className="pill" style={{ background: r.tint, borderColor: r.color, color: r.color }}>
      <span className="dot-m" style={{ background: r.color }} />
      {r.label}
    </span>
  );
}

export function RiskPill({ level, score }) {
  const r = RISK[level];
  return (
    <span className="pill" style={{ borderColor: r.color, color: r.color }}>
      <span className="dot-m" style={{ background: r.color }} />
      {r.label}
      {score != null ? <span className="mono">{score.toFixed(2)}</span> : null}
    </span>
  );
}

export function Meter({ value, color = 'var(--ink)' }) {
  return (
    <div className="bar">
      <span style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

/** Competence read-out: the Wilson lower bound beside the raw rate it is held below. */
export function Competence({ lower, successes, outcomes, required }) {
  const raw = successes / outcomes;
  const met = lower >= required;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="mono" style={{ fontSize: 24, fontWeight: 500 }}>
          {lower.toFixed(2)}
        </span>
        <span className="tiny faint">
          lower bound · raw <span className="mono">{raw.toFixed(2)}</span> ({successes} of {outcomes})
        </span>
      </div>
      <Meter value={lower} color={met ? 'var(--route-auto)' : 'var(--ink)'} />
      <span className="tiny faint">
        {required != null
          ? met
            ? `Meets the ${required.toFixed(2)} required for this class`
            : `Below the ${required.toFixed(2)} required for this class`
          : null}
      </span>
    </div>
  );
}

export function Evidence({ facts }) {
  return (
    <div className="evidence">
      {facts.map((f) => (
        <div className="fact" key={f.id}>
          <span className="fact-stmt">{f.statement}</span>
          <span className="fact-src">
            {f.id} · {f.source}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Steps({ steps, current }) {
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <span key={s} style={{ display: 'contents' }}>
          {i > 0 ? <span className="step-sep" /> : null}
          <span className={`step ${i < current ? 'done' : ''} ${i === current ? 'now' : ''}`}>
            <span className="n">{i + 1}</span>
            {s}
          </span>
        </span>
      ))}
    </div>
  );
}
