"""Persistence. Postgres (Neon) when DATABASE_URL is set, plain files in DATA_DIR otherwise or whenever the database
fails. The app must never crash because the database is missing or slow, so every call degrades to files.

Reads are served from memory after the first load and writes go to the database from a background thread
(write-behind), so the UI never waits on a round trip to the database. Set the URL as an environment variable
(.env locally, the Variables tab on Alternate Clouds). Never commit it."""
import os, json, time, queue, threading
from pathlib import Path

def _load_dotenv():
    p = Path(__file__).parent / ".env"
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            k, _, v = line.strip().partition("=")
            if k and not k.startswith("#"): os.environ.setdefault(k, v)   # a variable already set (even empty) wins
_load_dotenv()

DATA = Path(os.getenv("DATA_DIR", "data")); DATA.mkdir(exist_ok=True)
URL = os.environ.get("DATABASE_URL", "").strip()
SCHEMA = ["create table if not exists kv(key text primary key, value jsonb not null, updated timestamptz default now())",
          "create table if not exists events(id bigserial primary key, stream text not null, ts timestamptz default now(), data jsonb not null)",
          "create index if not exists events_stream_idx on events(stream, id desc)"]
CAP = 300                                    # events kept in memory per stream

_lock = threading.RLock()
_conn = None
_down_until = 0.0
_kv: dict = {}                               # key -> value, authoritative in this process once loaded
_ev: dict = {}                               # stream -> list of records, newest first
_jobs: "queue.Queue" = queue.Queue()

def _db():
    """A live connection, or None (no URL, or recently failed)."""
    global _conn, _down_until
    if not URL or time.time() < _down_until: return None
    with _lock:
        if _conn is not None and not _conn.closed: return _conn
        try:
            import psycopg
            c = psycopg.connect(URL, connect_timeout=8, autocommit=True)
            for s in SCHEMA: c.execute(s)
            _conn = c; print("[persist] using postgres"); return c
        except Exception as e:
            _down_until = time.time() + 30; _conn = None
            print(f"[persist] database unavailable, using files ({type(e).__name__})"); return None

def backend() -> str: return "postgres" if _db() is not None else "files"

def _run(fn):
    """Run fn(conn). On any failure mark the database down and return False."""
    global _down_until
    c = _db()
    if c is None: return False
    try:
        with _lock: fn(c)
        return True
    except Exception as e:
        _down_until = time.time() + 30; print(f"[persist] write failed, falling back to files ({type(e).__name__})"); return False

def _worker():
    while True:
        fn = _jobs.get()
        try: fn()
        except Exception as e: print(f"[persist] background job failed ({type(e).__name__})")
threading.Thread(target=_worker, daemon=True).start()

# ---------------------------------------------------------------- key/value documents
def get(key, default=None):
    with _lock:
        if key in _kv: return _kv[key]
    val, found = default, False
    c = _db()
    if c is not None:
        try:
            r = c.execute("select value from kv where key=%s", (key,)).fetchone()
            if r: val, found = r[0], True
        except Exception: pass
    if not found and (DATA / f"{key}.json").exists():
        try: val, found = json.loads((DATA / f"{key}.json").read_text(encoding="utf-8")), True
        except Exception: pass
    if found:
        with _lock: _kv[key] = val
    return val

def put(key, value):
    with _lock: _kv[key] = value
    snap = json.dumps(value)                 # snapshot now: later mutations must not race the background write
    def job():
        from psycopg.types.json import Jsonb
        if not _run(lambda c: c.execute("insert into kv(key,value) values (%s,%s) on conflict(key) do update set value=excluded.value, updated=now()", (key, Jsonb(json.loads(snap))))):
            (DATA / f"{key}.json").write_text(snap, encoding="utf-8")
    _jobs.put(job) if _db() is not None else _write_file(key, snap)

def _write_file(key, snap):
    try: (DATA / f"{key}.json").write_text(snap, encoding="utf-8")
    except OSError: pass

def delete(key):
    with _lock: _kv.pop(key, None)
    (DATA / f"{key}.json").unlink(missing_ok=True)
    _jobs.put(lambda: _run(lambda c: c.execute("delete from kv where key=%s", (key,))))

# ---------------------------------------------------------------- append-only event streams
def append(stream, rec):
    rec = {"t": time.strftime("%Y-%m-%d %H:%M:%S"), **rec}
    with _lock:
        _load_stream(stream); _ev[stream].insert(0, rec); del _ev[stream][CAP:]
    line = json.dumps(rec)
    def job():
        from psycopg.types.json import Jsonb
        if not _run(lambda c: c.execute("insert into events(stream,data) values (%s,%s)", (stream, Jsonb(rec)))):
            with open(DATA / f"{stream}.jsonl", "a", encoding="utf-8") as f: f.write(line + "\n")
    if _db() is not None: _jobs.put(job)
    else:
        with open(DATA / f"{stream}.jsonl", "a", encoding="utf-8") as f: f.write(line + "\n")
    return rec

def _load_stream(stream):
    if stream in _ev: return
    rows = []
    c = _db()
    if c is not None:
        try: rows = [r[0] for r in c.execute("select data from events where stream=%s order by id desc limit %s", (stream, CAP)).fetchall()]
        except Exception: rows = []
    if not rows and (DATA / f"{stream}.jsonl").exists():
        try: rows = [json.loads(x) for x in (DATA / f"{stream}.jsonl").read_text(encoding="utf-8").splitlines()[-CAP:]][::-1]
        except Exception: rows = []
    _ev[stream] = rows

def tail(stream, n=20):
    with _lock: _load_stream(stream); return list(_ev[stream][:n])

def clear_stream(stream):
    with _lock: _ev[stream] = []
    (DATA / f"{stream}.jsonl").unlink(missing_ok=True)
    _jobs.put(lambda: _run(lambda c: c.execute("delete from events where stream=%s", (stream,))))

def flush(timeout=10):
    """Wait for queued writes (tests, shutdown)."""
    end = time.time() + timeout
    while not _jobs.empty() and time.time() < end: time.sleep(0.05)
    time.sleep(0.1)
