'use client';

import { useState } from 'react';
import { nextId } from '../../app/onboarding/_data/merge';
import { SourceChip } from './Frame';

/** Skills as removable tags. Enter or comma adds the typed tag. */
export function TagInput({ id, value, onChange, placeholder = 'Add a skill and press Enter' }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };

  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center',
        minHeight: 44, padding: '6px 8px',
        border: '1px solid var(--line)', borderRadius: 'var(--r-ctl)', background: 'var(--bg)',
      }}
    >
      {value.map((t) => (
        <span className="pill" key={t}>
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-faint)', lineHeight: 1 }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        style={{ flex: '1 1 140px', minWidth: 120, border: 0, outline: 'none', background: 'none', padding: '4px 2px' }}
      />
    </div>
  );
}

/**
 * A repeatable list of one-line statements, such as permitted claims.
 * Rows are { id, text, quote, source, confirmed }; an imported row shows where
 * it came from and the words that support it, and editing it confirms it.
 */
export function ListEditor({ label, items, onChange, idPrefix, addLabel = 'Add', placeholder, empty }) {
  const set = (id, patch) => onChange(items.map((x) => (x.id === id ? { ...x, ...patch, confirmed: true } : x)));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {!items.length && empty ? <span className="tiny faint">{empty}</span> : null}
      {items.map((it, i) => (
        <div key={it.id} className="stack" style={{ gap: 5 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <input
                aria-label={`${label} ${i + 1}`}
                value={it.text}
                placeholder={placeholder}
                onChange={(e) => set(it.id, { text: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(items.filter((x) => x.id !== it.id))}
            >
              Remove
            </button>
          </div>
          {it.source ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <SourceChip source={it.source} confirmed={it.confirmed} />
              {it.quote ? <span className="tiny faint">&ldquo;{it.quote}&rdquo;</span> : null}
            </div>
          ) : null}
        </div>
      ))}
      <AddLine
        label={addLabel}
        placeholder={placeholder}
        onAdd={(text) => onChange([...items, { id: nextId(idPrefix, items), text, quote: '', source: null, confirmed: true }])}
      />
    </div>
  );
}

/** An always-visible box for adding one more line of your own. Enter or the button adds it. */
function AddLine({ label, placeholder, onAdd }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div className="field" style={{ flex: 1 }}>
        <input
          aria-label={label}
          value={draft}
          placeholder={`${placeholder ? `${placeholder} — ` : ''}type your own and press Enter`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          style={{ borderStyle: 'dashed' }}
        />
      </div>
      <button type="button" className="btn btn-sm" onClick={add} disabled={!draft.trim()}>
        {label}
      </button>
    </div>
  );
}

/**
 * Anything the fixed fields do not cover, as label and value pairs. Rows are
 * { id, label, value }; empty rows are dropped when the record is emitted.
 */
export function CustomFields({ items = [], onChange, idPrefix, title = 'Anything else', hint, labelPlaceholder = 'Field', valuePlaceholder = 'Value' }) {
  const set = (id, patch) => onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        {hint ? <div className="tiny faint" style={{ marginTop: 2 }}>{hint}</div> : null}
      </div>
      {items.map((it, i) => (
        <div key={it.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <input aria-label={`${title} ${i + 1} name`} placeholder={labelPlaceholder} value={it.label} onChange={(e) => set(it.id, { label: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '2 1 220px' }}>
            <input aria-label={`${title} ${i + 1} value`} placeholder={valuePlaceholder} value={it.value} onChange={(e) => set(it.id, { value: e.target.value })} />
          </div>
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>
            Remove
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => onChange([...items, { id: nextId(idPrefix, items), label: '', value: '' }])}>
          + Add a field
        </button>
      </div>
    </div>
  );
}

/** Previous projects for one person: rows are { id, name, client, summary }. */
export function ProjectList({ items = [], onChange, idPrefix }) {
  const set = (id, patch) => onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((p, i) => (
        <div key={p.id} className="stack" style={{ gap: 6, padding: 12, border: '1px solid var(--line-soft)', borderRadius: 'var(--r-ctl)', background: 'var(--paper)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '2 1 200px' }}>
              <input aria-label={`Project ${i + 1} name`} placeholder="Project" value={p.name} onChange={(e) => set(p.id, { name: e.target.value })} />
            </div>
            <div className="field" style={{ flex: '1 1 150px' }}>
              <input aria-label={`Project ${i + 1} client`} placeholder="For (client or employer)" value={p.client} onChange={(e) => set(p.id, { client: e.target.value })} />
            </div>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => onChange(items.filter((x) => x.id !== p.id))}>
              Remove
            </button>
          </div>
          <div className="field">
            <input aria-label={`Project ${i + 1} summary`} placeholder="What they did on it, in a line" value={p.summary} onChange={(e) => set(p.id, { summary: e.target.value })} />
          </div>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => onChange([...items, { id: nextId(idPrefix, items), name: '', client: '', summary: '' }])}>
          + Add a project
        </button>
      </div>
    </div>
  );
}

/** Drop or pick several files at once. */
export function DropZone({ onFiles, accept = '.pdf,.docx,.csv,.txt,.md', children, compact = false }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        textAlign: 'center', cursor: 'pointer',
        padding: compact ? '16px 14px' : '34px 18px',
        border: `1px dashed ${over ? 'var(--ink)' : 'var(--ink-faint)'}`,
        borderRadius: 'var(--r-card)',
        background: over ? 'var(--surface-2)' : 'var(--paper)',
      }}
    >
      <input
        type="file"
        multiple
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {children}
    </label>
  );
}

/** Yes / no as two radio rows, for the fit check. */
export function YesNo({ name, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        [true, 'Yes'],
        [false, 'No'],
      ].map(([v, l]) => (
        <label key={l} className="radio-row" style={{ flex: '0 0 auto', padding: '8px 14px', alignItems: 'center' }}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          <span className="rl-title">{l}</span>
        </label>
      ))}
    </div>
  );
}
