'use client';

import { useCallback } from 'react';
import { mergeFileResult, mergeWebsite } from '../../app/onboarding/_data/merge';
import { useOnboarding } from './state';

/**
 * Sends the owner's sources to the extraction routes and folds the results
 * into the onboarding record. Progress is kept on the record itself
 * (profile.imports) so it survives moving between screens.
 */
export function useImporter() {
  const { apply } = useOnboarding();

  const setImports = useCallback(
    (fn) => apply((p) => ({ ...p, imports: fn(p.imports) })),
    [apply],
  );

  const importWebsite = useCallback(
    async (url) => {
      setImports((im) => ({ ...im, website: { url, status: 'reading' } }));
      try {
        const res = await fetch('/api/onboarding/website', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json().catch(() => ({ error: 'The server sent an unreadable reply.' }));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status}).`);

        apply((p) => ({
          ...mergeWebsite(p, data),
          imports: {
            ...p.imports,
            website: {
              url,
              status: 'done',
              pages: data.pages?.length || 0,
              found: { team: data.team?.length || 0, clients: data.clients?.length || 0, claims: data.claims?.length || 0 },
              warn: data.fit?.regulated_profession
                ? 'The site describes a regulated profession. Bizzii is not designed for one; check the fit answers.'
                : data.fit?.delivers_information === false
                  ? 'The site suggests the business delivers goods or on-site services rather than information; check the fit answers.'
                  : null,
            },
          },
        }));
      } catch (e) {
        setImports((im) => ({ ...im, website: { url, status: 'failed', error: e.message } }));
      }
    },
    [apply, setImports],
  );

  const importFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      const names = files.map((f) => f.name);

      setImports((im) => ({
        ...im,
        files: [...im.files.filter((f) => !names.includes(f.name)), ...names.map((name) => ({ name, status: 'reading' }))],
      }));

      const settle = (rows) =>
        setImports((im) => ({ ...im, files: im.files.map((f) => rows.find((r) => r.name === f.name) || f) }));

      try {
        const body = new FormData();
        for (const f of files) body.append('files', f);
        const res = await fetch('/api/onboarding/files', { method: 'POST', body });
        const data = await res.json().catch(() => ({ error: 'The server sent an unreadable reply.' }));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status}).`);

        apply((p) => {
          let q = p;
          // the first source to fill a field wins, so the document that says most
          // about the business itself (a company profile, not a brand guide) goes first
          const businessDetail = (r) =>
            r.kind !== 'company_document' ? -1
              : ['category', 'owner_name', 'owner_email', 'contact_email', 'country', 'description'].filter((k) => r.doc[k]).length
                + (r.doc.team?.length ? 1 : 0) + (r.doc.clients?.length ? 1 : 0);
          const ordered = data.results.filter((r) => r.ok).sort((a, b) => businessDetail(b) - businessDetail(a));
          for (const r of ordered) q = mergeFileResult(q, r);
          const rows = data.results.map((r) => ({
            name: r.name,
            status: r.ok ? (r.kind === 'other' ? 'skipped' : 'done') : 'failed',
            kind: r.kind,
            error: r.ok ? (r.kind === 'other' ? r.note || 'Not a resume, company document or client list.' : null) : r.error,
            found:
              r.kind === 'client_list' ? `${r.clients.length} clients from ${r.rows} rows`
                : r.kind === 'resume' ? `${r.resume.name || 'one person'}, ${r.resume.skills?.length || 0} skills`
                  : r.kind === 'company_document' ? 'brand and business details'
                    : null,
          }));
          return { ...q, imports: { ...q.imports, files: q.imports.files.map((f) => rows.find((r) => r.name === f.name) || f) } };
        });
      } catch (e) {
        settle(names.map((name) => ({ name, status: 'failed', error: e.message })));
      }
    },
    [apply, setImports],
  );

  return { importWebsite, importFiles };
}
