# Bizzii: Human + AI, better together

Agentika 2.0 (NaSCon'26). Agents propose, a deterministic **Risk-Trust Gate** decides how much a human has to be
involved, and says why. Autonomy is earned from verified outcomes, per kind of action, and shrinks the human's workload
over time. Competence ("is the agent good") and consent ("does the owner want to delegate") are tracked separately.

## The flow
1. **Onboarding** (`/onboarding`): guided setup of the business, team, clients, brand and simulated connections. It can
   read a website, documents, CVs and a client CSV (Gemini), and every imported value must be confirmed by the owner.
   The final step posts its fixture JSON to the gate, which becomes the business memory the guardrail checks against.
2. **Lead generation** (`/leads`): the Sales agent finds businesses (OpenStreetMap listings, or paste a website), reads
   each site politely, scores fit with a transparent rubric, and drafts a first email from recorded facts only.
3. **Gate and approvals** (`/gate`): every proposal passes guardrail, floor rules, risk and evidence, then takes one of
   five routes: refuse, escalate, ask, recall window, or automatic. First contact with a stranger is always escalated
   (floor rule F2). The owner answers with three buttons: Approve, "Right, but I'd rather do it myself", "Wrong".

## Architecture
```
Next.js :8000 (public)  ──  /onboarding wizard + its Gemini import routes
        │ proxies /gate /leads /state /propose /decision /api/...
        ▼
FastAPI :8001  gate.py (deterministic routing)  catalogue.py (22 FYP classes + publish_post demo extension)
               store.py (facts with owners)  leadgen.py  crawl.py  executors.py (verify postconditions)
               persist.py ──► Postgres (Neon) or local files
```
No LLM takes part in routing. LLMs only draft, and the gate re-checks every citation.

## Run locally
```
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn server:app --port 8001          # gate + lead gen
cd onboarding-ui && npm ci && npm run build && npx next start -p 8000   # open http://localhost:8000
python -m pytest -q                                             # 48 tests (gate, agents, console API, inbox)
```
Gate and lead pages also work directly on :8001 (`/`, `/leads`).

## Deploy (Alternate Clouds)
One container, port **8000** (`Dockerfile`, `start.sh`). Set **PORT = 8000** on the Source tab, add variables
(`DATABASE_URL`, optionally `GROQ_API_KEY`, `GEMINI_API_KEY`, SMTP vars), **Rebuild**, wait, **Deploy**, check Logs for
`Application startup complete`. One Python worker on purpose: gate evidence and recall timers are in memory, and a
redeploy resets the demo to its seeded state.

## Honest limits
- The starting history is **seeded** for the demo. The live flip (one more approval makes `assign_subtask` automatic)
  and the refusals run for real. Real promotion on a higher-risk class takes far more reviewed decisions.
- Thresholds and risk weights are provisional. The guardrail checks that cited facts belong to the right party; it does
  not verify every claim in a draft.
- Email never reaches a real prospect: it is written to the outbox and, if configured, delivered to a test inbox only.
- Sample leads are labelled as sample data. `publish_post` is a hackathon extension that exists to show floor rules.

## Built on
FYP F26-068 Bizzii (gate design, onboarding wizard, 22-class catalogue) and the BinaryNext outreach tool (design
reference for discovery, polite crawling and scoring; re-implemented here, not imported).
