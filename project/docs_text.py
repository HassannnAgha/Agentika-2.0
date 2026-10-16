"""Text out of an attached document. The file is read once to extract text and never kept, never executed (FYP 4.4.6).
Supported: PDF, DOCX, TXT, MD, CSV. Anything else, or anything that yields no text (a scanned image), counts as UNREAD,
and the Operations agent tells the owner instead of guessing."""
import io, re, zipfile, base64

READABLE = (".pdf", ".docx", ".txt", ".md", ".csv")
MAX_BYTES = 8_000_000
MAX_CHARS = 20_000

def extract(name: str, data: bytes):
    """Returns (text, reason). text is None when the file could not be read; reason says why."""
    n = (name or "").lower()
    if not n.endswith(READABLE): return None, f"{n.rsplit('.', 1)[-1] if '.' in n else 'this'} files are not read"
    if len(data) > MAX_BYTES: return None, "file is too large to read"
    try:
        if n.endswith(".pdf"):
            from pypdf import PdfReader
            r = PdfReader(io.BytesIO(data))
            if r.is_encrypted: return None, "the PDF is password protected"
            text = "\n".join((p.extract_text() or "") for p in r.pages[:30])
        elif n.endswith(".docx"):
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                xml = z.read("word/document.xml").decode("utf8", "ignore")
            text = re.sub(r"<[^>]+>", " ", re.sub(r"</w:p>", "\n", xml))
        else:
            text = data.decode("utf8", "ignore")
    except Exception as e:
        return None, f"could not be opened ({type(e).__name__})"
    text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) < 20: return None, "no readable text found (it may be a scan or an image)"
    return text[:MAX_CHARS], ""

def from_attachment(att: dict):
    """att: {name, text?, content_b64?}. Prefers supplied text, else decodes the bytes."""
    name = att.get("name", "attachment")
    if att.get("text"): return (att["text"][:MAX_CHARS], "") if len(att["text"].strip()) >= 20 else (None, "no readable text found")
    if att.get("content_b64"):
        try: return extract(name, base64.b64decode(att["content_b64"], validate=False))
        except Exception: return None, "could not be decoded"
    return extract(name, b"")[0] and (None, "") or (None, "no content supplied" if name.lower().endswith(READABLE) else f"{name.rsplit('.',1)[-1]} files are not read")
