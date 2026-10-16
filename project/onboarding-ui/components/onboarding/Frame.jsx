'use client';

import Link from 'next/link';
import Anno from '../Anno';
import Halftone from '../Halftone';
import { Steps } from '../bits';
import { STEPS, confirmScreen, stepHref, unconfirmedCount } from '../../app/onboarding/_data/profile';
import { useOnboarding } from './state';

/**
 * Where an imported value came from. Dashed until the owner confirms it,
 * because until then it is the system's reading of a source, not a fact.
 * Monochrome on purpose: colour in this interface means a gate route or a
 * risk level, and this is neither.
 */
export function SourceChip({ source, confirmed }) {
  if (!source) return null;
  return (
    <span
      className="pill tiny"
      title={confirmed ? `Confirmed by you · from ${source}` : `Imported from ${source} · not yet confirmed`}
      style={{
        background: 'var(--bg)',
        borderStyle: confirmed ? 'solid' : 'dashed',
        borderColor: confirmed ? 'var(--line)' : 'var(--ink-faint)',
        color: 'var(--ink-dim)', fontWeight: 400, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {confirmed ? '✓ ' : ''}from {source}
    </span>
  );
}

/** Label row for a scalar field: the label, then the chip if it was imported. */
export function FieldLabel({ htmlFor, children, path }) {
  const { profile } = useOnboarding();
  const prov = path ? profile.provenance[path] : null;
  return (
    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <label htmlFor={htmlFor}>{children}</label>
      {prov?.source ? <SourceChip source={prov.source} confirmed={prov.confirmed} /> : null}
    </span>
  );
}

/**
 * The page around every onboarding screen: brand, step bar, heading, the
 * back/continue row and the report caption.
 *
 * `readBy` names what consumes the screen's fields downstream. It is the
 * field-to-consumer table (plan B2) shown where the owner fills the fields in.
 *
 * `blocked` is a reason string. While set, Continue is disabled and the reason
 * is shown beside it, so the owner is never left guessing why.
 *
 * `screen` names the screen's share of the record. Imported values on it that
 * the owner has not confirmed also block Continue, behind one Confirm all.
 */
export default function Frame({
  step,
  title,
  lede,
  children,
  readBy = [],
  blocked: blockedBy = null,
  screen = null,
  next = null,
  onNext = null, // last step only: run an action instead of following a link
  nextLabel = 'Continue',
  wide = false,
  art = { variant: 'terrain', tone: 'blue' },
  anno,
}) {
  const { profile, apply } = useOnboarding();
  const pending = screen ? unconfirmedCount(profile, screen) : 0;
  const blocked =
    blockedBy ?? (pending ? `${pending} imported ${pending === 1 ? 'value is' : 'values are'} not yet confirmed` : null);

  const confirmBar = pending ? (
    <div className="notice" style={{ alignItems: 'center', borderStyle: 'dashed', borderColor: 'var(--ink-faint)' }}>
      <span style={{ flex: 1 }}>
        <strong>
          Checked everything above? {pending} {pending === 1 ? 'value was' : 'values were'} read from your sources.
        </strong>{' '}
        Agents treat what is recorded here as true. Editing a value also confirms it.
      </span>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => apply((p) => confirmScreen(p, screen))}>
        Confirm all
      </button>
    </div>
  ) : null;

  const label = `Step ${step + 1} of ${STEPS.length}`;
  const nextHref = next ?? (step + 1 < STEPS.length ? stepHref(step + 1) : null);

  const actions = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {step > 0 ? (
        <Link href={stepHref(step - 1)} className="btn btn-quiet">Back</Link>
      ) : null}
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {blocked ? <span className="tiny" style={{ color: 'var(--route-escalate)' }}>{blocked}</span> : null}
        {nextHref || onNext ? (
          blocked ? (
            <button type="button" className="btn btn-primary" disabled style={{ opacity: 0.35, cursor: 'not-allowed' }}>
              {nextLabel}
            </button>
          ) : onNext ? (
            <button type="button" className="btn btn-primary" onClick={onNext}>{nextLabel}</button>
          ) : (
            <Link href={nextHref} className="btn btn-primary">{nextLabel}</Link>
          )
        ) : null}
      </span>
    </div>
  );

  const head = (
    <>
      <Link href="/" className="brand" style={{ padding: 0 }}>
        <span className="brand-mark" aria-hidden="true">B</span>
        <span className="brand-name" style={{ fontSize: 18 }}>Bizzii</span>
      </Link>

      <Steps steps={STEPS.map((s) => s.label)} current={step} />

      <div>
        <h1 className="display" style={{ fontSize: 40, margin: '0 0 8px' }}>{title}</h1>
        {lede ? <p className="dim" style={{ margin: 0, fontSize: 14, maxWidth: '70ch' }}>{lede}</p> : null}
      </div>
    </>
  );

  const readByList = readBy.length ? (
    <div className="stack" style={{ gap: 8 }}>
      {readBy.map((r) => (
        <div key={r.field} style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 500 }}>{r.field}</span>
          <span className="faint"> — {r.by}</span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <main>
      {wide ? (
        <>
          <div className="ht-band pale">
            <Halftone variant={art.variant} tone={art.tone} cols={88} rows={9} fit="xMidYMid slice" />
            <span className="ht-label">{label}</span>
          </div>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '44px 24px 110px' }} className="stack">
            {head}
            {children}
            {readByList ? (
              <div className="card">
                <div className="card-head"><h2>What reads this</h2></div>
                <div className="card-body">{readByList}</div>
              </div>
            ) : null}
            {confirmBar}
            {actions}
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(520px, 100%), 1fr))',
            minHeight: '100vh',
          }}
        >
          <div style={{ padding: '44px 48px 110px' }} className="stack">
            {head}
            {children}
            {confirmBar}
            {actions}
          </div>

          <div className="ht-panel">
            <Halftone variant={art.variant} tone={art.tone} cols={56} rows={34} />
            <div className="float-card" style={{ top: 'auto', bottom: 56 }}>
              <div className="kicker" style={{ marginBottom: 12 }}>{label} · What reads this</div>
              {readByList ?? <div className="tiny faint">Nothing downstream reads this screen.</div>}
            </div>
          </div>
        </div>
      )}

      {anno ? <Anno {...anno} /> : null}
    </main>
  );
}
