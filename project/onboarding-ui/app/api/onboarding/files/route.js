import { MAX_FILES, readFiles } from '../../../../lib/onboarding/files';

/**
 * POST multipart, field "files" repeated -> one result per file.
 *
 * Documents are read together to spare the daily quota, but each file still
 * gets its own result, so one unreadable file does not cost the owner the rest.
 */
export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected a file upload.' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f) => typeof f === 'object' && 'arrayBuffer' in f);
  if (!files.length) return Response.json({ error: 'No files were sent.' }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `At most ${MAX_FILES} files at a time.` }, { status: 413 });

  return Response.json({ results: await readFiles(files) });
}
