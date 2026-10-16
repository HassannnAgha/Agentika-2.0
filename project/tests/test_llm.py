"""The LLM wrapper: citation stripping and the model fallback chain. No network (httpx is stubbed)."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import llm

def test_strip_citations_only_removes_real_fact_ids():
    t = "We build sites (5) and scope in writing (6, 7). Founded (2019). Team of 12 [3]. Open (fact 9) and (4 and 8)."
    assert llm.strip_citations(t, {5, 6, 7, 3, 9, 4, 8}) == "We build sites and scope in writing. Founded (2019). Team of 12. Open and."
    assert llm.strip_citations("Call us (5) now", set()) == "Call us (5) now"        # no known ids: nothing is touched

class R:
    def __init__(self, code, body=None): self.status_code, self._b = code, body or {}
    def raise_for_status(self):
        import httpx
        if self.status_code >= 400: raise httpx.HTTPStatusError("x", request=None, response=self)
    def json(self): return self._b

def ok(content): return R(200, {"choices": [{"message": {"content": json.dumps(content)}}]})

def test_retired_model_falls_through_to_the_next(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k"); monkeypatch.setenv("GROQ_MODEL", "old/retired-model"); llm._dead.clear()
    tried = []
    def post(url, **kw):
        tried.append(kw["json"]["model"]); return R(404) if kw["json"]["model"] == "old/retired-model" else ok({"fine": True})
    monkeypatch.setattr(llm.httpx, "post", post)
    assert llm.json_call("s", "u") == {"fine": True}
    assert tried == ["old/retired-model", "openai/gpt-oss-120b"] and "old/retired-model" in llm._dead
    tried.clear(); llm.json_call("s", "u"); assert tried == ["openai/gpt-oss-120b"]   # the dead one is not retried

def test_reasoning_effort_only_for_models_that_take_it(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k"); monkeypatch.delenv("GROQ_MODEL", raising=False); llm._dead.clear(); seen = []
    monkeypatch.setattr(llm.httpx, "post", lambda url, **kw: (seen.append(kw["json"]), ok({"a": 1}))[1])
    llm.json_call("s", "u"); assert seen[0]["reasoning_effort"] == "low"
    llm._dead.update({"openai/gpt-oss-120b", "openai/gpt-oss-20b"}); seen.clear(); llm.json_call("s", "u"); assert "reasoning_effort" not in seen[0]

def test_every_model_failing_returns_none_not_an_exception(monkeypatch):
    import httpx
    monkeypatch.setenv("GROQ_API_KEY", "k"); llm._dead.clear()
    def boom(url, **kw): raise httpx.ConnectTimeout("slow")
    monkeypatch.setattr(llm.httpx, "post", boom)
    assert llm.json_call("s", "u") is None

def test_no_key_means_no_call_at_all(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False); llm._dead.clear()
    monkeypatch.setattr(llm.httpx, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("must not call")))
    assert llm.json_call("s", "u") is None and llm.available() is False
