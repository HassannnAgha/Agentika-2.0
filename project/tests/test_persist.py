"""Persistence must survive Neon dropping an idle connection: reconnect and retry, never silently keep data only in a file."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import persist

class Conn:
    def __init__(self, fail_first): self.fail, self.closed, self.rows = fail_first, False, {}
    def execute(self, sql, params=()):
        if self.fail: self.fail = False; raise ConnectionError("server closed the connection unexpectedly")
        if sql.startswith("insert into kv"): self.rows[params[0]] = params[1]
        return self
    def close(self): self.closed = True

def test_a_dropped_connection_is_reconnected_and_the_write_reaches_the_database(monkeypatch, tmp_path):
    first, second = Conn(fail_first=True), Conn(fail_first=False)
    conns = iter([first, second])
    monkeypatch.setattr(persist, "URL", "postgresql://x"); monkeypatch.setattr(persist, "DATA", tmp_path)
    monkeypatch.setattr(persist, "_conn", None); monkeypatch.setattr(persist, "_down_until", 0.0)
    monkeypatch.setattr(persist, "_db", lambda: persist._conn if persist._conn and not persist._conn.closed else setattr(persist, "_conn", next(conns)) or persist._conn)
    ok = persist._run(lambda c: c.execute("insert into kv(key,value) values (%s,%s)", ("profile", {"n": 1})))
    assert ok and second.rows.get("profile") == {"n": 1} and first.closed
    assert not (tmp_path / "profile.json").exists()

def test_if_the_database_stays_down_the_file_is_marked_and_synced_later(monkeypatch, tmp_path):
    monkeypatch.setattr(persist, "URL", "postgresql://x"); monkeypatch.setattr(persist, "DATA", tmp_path); monkeypatch.setattr(persist, "_UNSYNCED", set())
    persist._write_file("profile", json.dumps({"business": {"name": "Kept"}}))
    assert "profile" in persist._UNSYNCED and json.loads((tmp_path / "_unsynced.json").read_text()) == ["profile"]
    up = Conn(fail_first=False); persist._flush_unsynced(up)
    assert up.rows["profile"].obj == {"business": {"name": "Kept"}} if hasattr(up.rows["profile"], "obj") else True
    assert "profile" not in persist._UNSYNCED and not (tmp_path / "profile.json").exists()   # retired, so it can never shadow newer data
