'use client';

import Link from 'next/link';
import { useState } from 'react';
import Frame from '../../../components/onboarding/Frame';
import { DropZone } from '../../../components/onboarding/fields';
import { useImporter } from '../../../components/onboarding/importer';
import { useOnboarding } from '../../../components/onboarding/state';

const KIND_LABEL = {
  resume: 'Resume',
  company_document: 'Company document',
  client_list: 'Client list',
  other: 'Not used',
};

function Status({ status }) {
  const text = { reading: 'Reading…', done: 'Read', failed: 'Could not read', skipped: 'Not used' }[status];
  return (
    <span
      className="pill tiny mono"
      style={status === 'failed' ? { borderColor: 'var(--route-escalate)', color: 'var(--route-escalate)' } : undefined}
    >
      {status === 'reading' ? <span className="dot-m" style={{ background: 'var(--ink)', animation: 'pulse 1s infinite' }} /> : null}
      {text}
    </span>
  );
}

function Row({ title, sub, status, error, warn }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 18px', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{title}</div>
        {sub ? <div className="tiny faint" style={{ marginTop: 3 }}>{sub}</div> : null}
        {error ? <div className="tiny" style={{ marginTop: 3, color: status === 'failed' ? 'var(--route-escalate)' : 'var(--ink-faint)' }}>{error}</div> : null}
        {warn ? <div className="notice warn" style={{ marginTop: 8 }}><span>{warn}</span></div> : null}
      </div>
      <Status status={status} />
    </div>
  );
}

export default function Import() {
  const { profile } = useOnboarding();
  const { importWebsite, importFiles } = useImporter();
  const [url, setUrl] = useState(profile.imports.website?.url || '');

  const w = profile.imports.website;
  const files = profile.imports.files;
  const busy = w?.status === 'reading' || files.some((f) => f.status === 'reading');
  const anything = w || files.length;

  return (
    <Frame
      step={1}
      title="Start from what you already have"
      lede="Give us your website and drop in whatever describes the business: a company profile or brand guide, proposals, your team’s CVs, a client list exported from your invoicing or CRM. We read them and fill in the next screens. You check everything before it counts."
      readBy={[
        { field: 'Website', by: 'business profile, brand voice, positioning, the claims you already publish, named team and clients' },
        { field: 'CVs and resumes', by: 'one team member each: role, skills, experience' },
        { field: 'Company documents', by: 'brand voice, positioning, permitted and prohibited claims, named clients' },
        { field: 'Client spreadsheet', by: 'clients with contact, email, relationship start and last contact' },
      ]}
      blocked={busy ? 'Still reading your sources' : null}
      nextLabel={anything ? 'Check what was found' : 'Continue'}
      art={{ variant: 'terrain', tone: 'blue' }}
      anno={{
        fig: '4.8.2e',
        name: 'Onboarding — Import',
        covers: ['UC 4.6.2 Complete Onboarding (steps 1–7, from existing material)', 'MEM-2 provenance on every imported fact'],
      }}
    >
      <div className="card">
        <div className="card-head"><h2>Your website</h2></div>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) importWebsite(url.trim());
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <div className="field" style={{ flex: '1 1 240px' }}>
              <input
                aria-label="Website address"
                placeholder="yourbusiness.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
              />
            </div>
            <button type="submit" className="btn" disabled={!url.trim() || w?.status === 'reading'}>
              {w?.status === 'done' ? 'Read again' : 'Read site'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Documents, CVs and client lists</h2></div>
        <div className="card-body">
          <DropZone onFiles={importFiles}>
            <span style={{ fontWeight: 500 }}>Drop files here, or click to choose</span>
            <span className="tiny faint">PDF, Word (.docx), CSV or text · up to 20 files, 10 MB each · we work out which is which</span>
          </DropZone>
        </div>
      </div>

      {anything ? (
        <div className="card">
          <div className="card-head"><h2>What was read</h2></div>
          {w ? (
            <Row
              title={w.url}
              sub={
                w.status === 'done'
                  ? `Website · ${w.pages} ${w.pages === 1 ? 'page' : 'pages'} · ${w.found.team} people, ${w.found.clients} clients, ${w.found.claims} claims`
                  : 'Website'
              }
              status={w.status}
              error={w.error}
              warn={w.warn}
            />
          ) : null}
          {files.map((f) => (
            <Row
              key={f.name}
              title={f.name}
              sub={[f.kind ? KIND_LABEL[f.kind] : null, f.found].filter(Boolean).join(' · ') || null}
              status={f.status}
              error={f.error}
            />
          ))}
        </div>
      ) : null}

      <div className="notice">
        <span>
          Files are read once to extract the fields and are not stored. Everything found arrives marked as
          imported, and nothing is used until you confirm it on the screen where it appears.{' '}
          {!anything ? (
            <>
              Nothing to hand? <Link href="/onboarding/business" style={{ textDecoration: 'underline' }}>Fill the screens in yourself</Link>.
            </>
          ) : null}
        </span>
      </div>
    </Frame>
  );
}
