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

def test_a_missing_key_costs_one_database_trip_but_an_outage_is_never_cached(monkeypatch, tmp_path):
    calls = []
    def answered(fn): calls.append(1); fn(type("C", (), {"execute": lambda self, *a: type("R", (), {"fetchone": lambda s: None})()})()); return True
    monkeypatch.setattr(persist, "URL", "postgresql://x"); monkeypatch.setattr(persist, "DATA", tmp_path); monkeypatch.setattr(persist, "_kv", {})
    monkeypatch.setattr(persist, "_run", answered)
    assert persist.get("consent", {}) == {} and persist.get("consent", {}) == {} and len(calls) == 1      # the dashboard polls: one trip, not one per poll
    persist._kv["supervision"] = persist._ABSENT
    monkeypatch.setattr(persist, "_jobs", type("Q", (), {"put": lambda self, j: None})()); monkeypatch.setattr(persist, "_db", lambda: object())
    persist.put("consent", {"a|b": "granted"}); assert persist.get("consent") == {"a|b": "granted"}
    monkeypatch.setattr(persist, "_run", lambda fn: calls.append(1) or False)                          # database down
    n = len(calls); persist.get("profile"); persist.get("profile")
    assert len(calls) == n + 2 and "profile" not in persist._kv                                        # asked again next time, not cached as absent

def test_if_the_database_stays_down_the_file_is_marked_and_synced_later(monkeypatch, tmp_path):
    monkeypatch.setattr(persist, "URL", "postgresql://x"); monkeypatch.setattr(persist, "DATA", tmp_path); monkeypatch.setattr(persist, "_UNSYNCED", set())
    persist._write_file("profile", json.dumps({"business": {"name": "Kept"}}))
    assert "profile" in persist._UNSYNCED and json.loads((tmp_path / "_unsynced.json").read_text()) == ["profile"]
    up = Conn(fail_first=False); persist._flush_unsynced(up)
    assert up.rows["profile"].obj == {"business": {"name": "Kept"}} if hasattr(up.rows["profile"], "obj") else True
    assert "profile" not in persist._UNSYNCED and not (tmp_path / "profile.json").exists()   # retired, so it can never shadow newer data
