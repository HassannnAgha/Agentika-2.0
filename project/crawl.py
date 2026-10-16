"""Polite, safe website reader used by onboarding import and lead enrichment.
Respects robots.txt, follows contact-looking links, decodes obfuscated emails, refuses private addresses
(the public URL is open to anyone, so user-supplied URLs must not reach internal hosts)."""
import re, socket, ipaddress, html, time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import httpx

UA = "BizziiBot/1.0 (hackathon prototype; respects robots.txt)"
PATHS = ["", "/contact", "/contact-us", "/about", "/about-us", "/team", "/services"]
MAX_BYTES = 600_000

def safe_url(url: str):
    """Normalise to http(s) and refuse anything resolving to a non-public address. Returns url or None."""
    url = (url or "").strip()
    if not url: return None
    if not re.match(r"^https?://", url, re.I): url = "https://" + url
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname: return None
    try:
        for fam, *_, sa in socket.getaddrinfo(p.hostname, None):
            if not ipaddress.ip_address(sa[0]).is_global: return None
    except Exception:
        return None
    return url

class _Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.out, self.skip, self.title, self.in_title = [], 0, "", False
        self.meta, self.links, self.mailtos, self.raw_srcs = "", [], [], []
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag in ("script", "style", "noscript", "svg"): self.skip += 1
        if tag == "title": self.in_title = True
        if tag == "meta" and (a.get("name") or "").lower() in ("description", "og:description") or a.get("property") == "og:description":
            self.meta = self.meta or (a.get("content") or "")
        if tag == "a" and a.get("href"):
            h = a["href"]
            if h.lower().startswith("mailto:"): self.mailtos.append(h[7:].split("?")[0])
            else: self.links.append(h)
        if tag == "script" and a.get("src"): self.raw_srcs.append(a["src"])
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg") and self.skip: self.skip -= 1
        if tag == "title": self.in_title = False
    def handle_data(self, d):
        if self.in_title: self.title += d
        elif not self.skip and d.strip(): self.out.append(d.strip())

EMAIL = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9._%+\-]*@[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,24}")
OBFUSC = re.compile(r"([a-zA-Z0-9._%+\-]+)\s*(?:\[at\]|\(at\)|\{at\})\s*([a-zA-Z0-9\-]+(?:\s*(?:\[dot\]|\(dot\))\s*[a-zA-Z0-9\-]+)*)", re.I)
CFEMAIL = re.compile(r'data-cfemail="([0-9a-f]+)"')
BAD_TLD = {"png", "jpg", "jpeg", "gif", "svg", "webp", "css", "js"}
LOW = ("noreply", "no-reply", "donotreply", "postmaster", "abuse", "webmaster", "mailer-daemon")
PREFER = ["sales", "hello", "hi", "contact", "info", "team", "support", "admin"]
CHAT = ["intercom", "drift.com", "tawk.to", "crisp.chat", "hs-scripts", "zopim", "zdassets"]
BOOK = ["calendly.com", "acuityscheduling", "setmore", "book.squareup"]

def _cf(h):
    try:
        k = int(h[:2], 16); return "".join(chr(int(h[i:i+2], 16) ^ k) for i in range(2, len(h), 2))
    except Exception: return ""

def emails_in(raw: str, text: str, mailtos):
    found = list(mailtos) + [_cf(m) for m in CFEMAIL.findall(raw)] + EMAIL.findall(text)
    for u, d in OBFUSC.findall(text):
        found.append(u + "@" + re.sub(r"\s*(\[dot\]|\(dot\))\s*", ".", d, flags=re.I))
    out = []
    for e in found:
        e = html.unescape(e).strip().lower().rstrip(".")
        if EMAIL.fullmatch(e) and e.rsplit(".", 1)[-1] not in BAD_TLD and not e.startswith(LOW) and e not in out: out.append(e)
    out.sort(key=lambda e: PREFER.index(e.split("@")[0]) if e.split("@")[0] in PREFER else 99)
    return out

def read_site(url: str, max_pages: int = 5, delay: float = 0.4) -> dict:
    """-> {url,title,description,text,emails,signals,pages,errors}. Never raises."""
    res = {"url": url, "title": "", "description": "", "text": "", "emails": [], "signals": {}, "pages": [], "errors": []}
    base = safe_url(url)
    if not base: res["errors"].append("address is not a public website"); return res
    origin = "{0.scheme}://{0.netloc}".format(urlparse(base))
    rp = RobotFileParser()
    try:
        r = httpx.get(origin + "/robots.txt", headers={"User-Agent": UA}, timeout=6, follow_redirects=True)
        rp.parse([] if r.status_code >= 400 else r.text.splitlines())
    except Exception: rp.parse([])
    queue, seen, texts, mails, raw_all = [urljoin(origin, p) for p in PATHS], set(), [], [], ""
    with httpx.Client(headers={"User-Agent": UA}, timeout=8, follow_redirects=True) as c:
        while queue and len(res["pages"]) < max_pages:
            u = queue.pop(0)
            if u in seen: continue
            seen.add(u)
            if not rp.can_fetch(UA, u): continue
            try:
                r = c.get(u)
                if r.status_code >= 400 or "html" not in r.headers.get("content-type", "html"): continue
                if urlparse(str(r.url)).netloc != urlparse(origin).netloc and not safe_url(str(r.url)): continue
                raw = r.text[:MAX_BYTES]
            except Exception as e:
                if u == origin + "/": res["errors"].append(type(e).__name__)
                continue
            p = _Text(); p.feed(raw)
            res["pages"].append(u); raw_all += raw
            res["title"] = res["title"] or html.unescape(p.title).strip()
            res["description"] = res["description"] or html.unescape(p.meta).strip()
            texts.append(" ".join(p.out)[:6000]); mails += p.mailtos
            if u.rstrip("/") == origin:                       # follow contact-looking links found on the home page
                for h in p.links:
                    if re.search(r"contact|touch|about|team", h, re.I):
                        full = urljoin(u, h).split("#")[0]
                        if urlparse(full).netloc == urlparse(origin).netloc: queue.insert(1, full)
            time.sleep(delay)
    res["text"] = "\n".join(texts)[:14000]
    res["emails"] = emails_in(raw_all, res["text"], mails)
    low = (raw_all + " " + res["text"]).lower()
    res["signals"] = {"hiring": any(k in low for k in ("we're hiring", "we are hiring", "join our team", "open positions", "careers")),
                      "has_booking": any(k in low for k in BOOK) or any(k in low for k in ("book now", "book a call", "schedule a call")),
                      "has_chat": any(k in low for k in CHAT), "has_pricing": "pricing" in low}
    return res
