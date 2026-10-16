# Bizzii x Agentika 2.0: Development Map

Final build map from FYP to hackathon. Theme: **human in the loop automations.**
Stack: all custom code (Python, FastAPI, one HTML page). No n8n.

Fill in once you have them: kickoff time `____`, submission deadline `____`, judging format `____`.

---

## 1. One line pitch

Bizzii puts a **Risk-Trust Gate** between every agent and every action it proposes. The human is in the loop exactly as much as the evidence says, and that amount shrinks as the agent proves itself on each kind of action.

What makes it different from an approval queue: the gate keeps **competence** (is the agent good) and **consent** (does the owner want to delegate) as two separate measures. Same approval rate can mean a weak agent or a good agent with a reluctant owner, and the gate tells them apart.

---

## 2. What existed before vs what is built at the event

Declare this in the pitch and the submission form. Confirm with the organizers whether pre-built work is allowed.

| Existing before the event | Built at the event |
|---|---|
| Guided onboarding | Risk-Trust Gate (risk, floor rules, guardrail, W/A/D measures, earned test, routing) |
| Outreach automation (and lead gen feeding it) | Gate server, recall timers, approval loop with reason codes |
| FYP research and design (Chapters 1 to 6) | Outcome verification, trust dashboard, demo scenarios, deployment |

---

## 3. FYP to hackathon map

| FYP component (chapter) | Hackathon version | Status |
|---|---|---|
| Action classes and effect signature (5.2) | 4 classes in `gate.py` `CLASSES` | Done |
| Risk score, weighted ordinal (5.3) | `risk()` at equal weights | Done |
| Guardrails on content (5.4) | `guardrail()`: must cite facts, facts must belong to this client or the business | Done |
| Floor rules F1 to F4 (5.5) | `floor_rule()`, F2 is the live one for first outreach | Done |
| Five counters, three measures W/A/D (5.6, 5.7) | `Pair.measures()` with Wilson lower bounds | Done |
| Reason codes separate competence from consent (5.7) | 3 buttons: Approve, "Right, but I'd rather do it myself", "Wrong" | Done |
| Risk scaled thresholds, minimum evidence (5.8) | `tau()`, `n_min()` | Done, thresholds provisional |
| Earned test and 5 routes (5.9) | `Gate.decide()`: refuse, escalate, approval, recall, auto | Done |
| Recency window (5.10) | `deque(maxlen=WINDOW)` per agent and class | Done |
| Withdrawal with dead band (5.11) | `evaluate()` uses `DEAD_BAND` once a class is granted | Done |
| Audit sampling (5.11) | `AUDIT_RATE`, set to 0 in the demo for repeatability | Done, off for demo |
| Shared business memory (4.1.1) | `FACTS` dict with owner ids in `server.py` | Demo version, replace with your real data |
| Owner console (4.1.7) | `index.html`: approval queue, class cards, log | Done, minimal |
| Guided onboarding (4.1.6) | Your existing onboarding | Already built |
| Sales and outreach agent (4.2.5) | Your existing outreach automation | Already built, needs wiring |
| Project Management and Marketing agents (4.2.4, 4.2.6) | Thin versions: PM `assign_task`, Marketing `draft_content` and `publish_post`, each with its own trust record | Done in the gate, wire real executors |
| Operations agent (4.2.3) | Not built | Cut, roadmap |
| Outcome postconditions (5.6.3) | `executors.py` returns True/False after checking | Stubs, to wire |
| Audit demotion on severe failure, model version stamping | Not built | Cut, roadmap |
| Weight elicitation, sensitivity sweeps, owner study (5.12, evaluation) | Not built | Cut, roadmap |
| Multi owner support | Not built | Cut, single owner by design |

---

## 4. Files in the repo

| File | Purpose |
|---|---|
| `gate.py` | The gate. Deterministic, no LLM in routing |
| `server.py` | FastAPI server: `/propose`, `/decision`, `/state`, `/reset`, `/scenario/{name}`, `/health`, serves the dashboard, recall timers |
| `executors.py` | One function per action class. **Replace stubs with your real automation code.** Each returns True, False, or None (unverified) |
| `index.html` | Approval queue, per class W/A/D bars, scenario buttons, decision log |
| `demo_sim.py` | Simulation for the closer: same approval rate, different diagnosis |
| `Dockerfile`, `requirements.txt`, `.gitignore`, `.dockerignore` | Deployment on Alternate Clouds, port 8000, one worker |

---

## 5. Action classes

| Class | Signature (target, effect, blast, reversibility) | Risk | Behavior in the demo |
|---|---|---|---|
| create_task | teammate, create, one person, full | 0.20 | One more live approval flips it to Auto |
| update_crm | internal, modify, none, partial | 0.23 | Seeded as earned, runs after a recall window |
| send_followup | client, communicate, one person, partial | 0.53 | Still asks, 6 of 9 verified outcomes needed |
| cold_outreach | prospect, communicate, one person, partial | 0.60 | Always escalated by floor rule F2 until prior contact exists |
| assign_task (PM agent) | teammate, modify, one person, full | 0.25 | Seeded as earned, runs on its own |
| draft_content (Marketing agent) | internal, create, none, full | 0.05 | Seeded as earned, drafts freely |
| publish_post (Marketing agent) | public, broadcast, everyone, none | 1.00 | Always escalated by floor rules F1 and F3, never earnable |

Your outreach automation produces `cold_outreach` and `send_followup` proposals. That is the bridge between existing work and the gate.

Trust is held per agent and per class, and nothing transfers. The PM agent can be fully trusted on assigning tasks while the Sales agent still asks on every client follow-up. Marketing drafting freely but never publishing without you is the cleanest way to show the floor rules.

---

## 6. Development tasks

### Must do (no demo without these)

1. **Run the gate server locally and click every scenario.** `uvicorn server:app --port 8000`, open `localhost:8000`.
2. **Wire your outreach automation to the gate.** Stop sending directly. Build the proposal and call `POST /propose` instead.
3. **Replace the 4 stubs in `executors.py`** with your real send, CRM, and task code. After each action, check the result (email delivered, record holds the value, task exists) and return True or False.
4. **Replace the demo `FACTS`** in `server.py` with real client, lead and business facts that have ids and owners. The guardrail depends on every fact having an owner.
5. **Deploy a first version early** (first 1 to 2 hours): Source tab PORT = 8000, add variables, Rebuild, wait, Deploy, check Logs for `Application startup complete`.
6. **Test the live flip five times in a row:** reset with seeded history, approve one create_task, confirm the next one runs as Auto.

### Should do (these win the room)

7. **LLM drafts the proposal** (Groq free key). Force structured JSON with `cls`, `counterparty`, `cited` (fact ids) and `payload`. Read the key with `os.environ.get`, and fall back to the canned scenarios if it is missing so the app never crashes on startup.
8. **Stage the poisoned email for real:** an inbound message that pushes the agent to cite another client's fact. The guardrail refuses it and the owner never sees it.
9. **Owner notification link** by email or a bot message from your own code, pointing to the approval page.
10. **Side by side panel** of a pooled approval gate vs this gate on the same history (reuse `demo_sim.py` logic).

### Do not build

The Operations agent, deeper PM and Marketing logic (keep them to the three classes above), login system, multi owner, full console, demotion polish, evaluation chapter.

---

## 7. Proposal contract (what your automation sends)

```json
POST /propose
{
  "agent": "sales",
  "cls": "send_followup",
  "counterparty": "acme",
  "cited": [1, 2],
  "payload": {"to": "ops@acme.example", "subject": "Invoice #118", "body": "..."},
  "prior_contact": true
}
```

The gate never reads `payload`. It reads the class, the cited fact ids, and `prior_contact`. Routes returned: `refuse`, `escalate`, `approval`, `recall`, `auto`, each with a plain English `why`.

Owner decisions: `POST /decision {"id": 7, "kind": "approve" | "preference" | "quality"}`.

---

## 8. Demo script (3 to 4 minutes)

1. **Hook (20s).** Pitch line plus the declaration of what existed before.
2. **New lead (30s).** Outreach drafts a first email. Gate escalates: floor rule F2. "No amount of trust unlocks this, by design."
3. **Task creation earns trust (40s).** Approve one more. Dashboard flips create_task to Auto. The next one runs without asking.
4. **Client follow-up (40s).** Still asks. Click "Right, but I'd rather do it myself" and explain that this is a different signal from "Wrong".
5. **Poisoned email (40s).** Guardrail refuses it, owner is never bothered, agent is not penalised.
6. **Marketing (20s).** Draft post runs on its own. Publish post is escalated by F1 and F3. Different agents, separate trust records.
7. **Closer (40s).** Two cases, same approval rate: gate says "owner keeps judging proposals unsuitable" for one and "agent is sound but owner prefers to do this personally" for the other.
8. **Close (10s).** "Human in the loop should be earned, measured, and shrinking."

---

## 9. Acceptance checklist (all must pass before you freeze)

- [ ] Reset with seeded history gives: create_task asks, update_crm recall, send_followup asks, cold_outreach escalated
- [ ] One approved create_task flips the next one to Auto
- [ ] Marketing publish is escalated with F1, PM assign and Marketing draft run as Auto
- [ ] Poisoned scenario returns `refuse` with the leaked fact id in the reason
- [ ] Recall countdown shows, Stop buttons work, executes after the timer when untouched
- [ ] A failing executor (`DEMO_FAIL_RATE=1`) records a failed outcome and does not crash the server
- [ ] Real outreach is only sent to a test inbox
- [ ] Public URL loads, `/health` returns ok, Logs show `Application startup complete`
- [ ] Full demo runs three times in a row without touching code
- [ ] Backup video of a clean run recorded

---

## 10. Deployment (Alternate Clouds)

- Dockerfile serves on **8000**. Source tab PORT must be 8000, or you get a 502.
- Order: set Variables, **Rebuild**, wait for success, **Deploy**. A GitHub push alone does nothing.
- Variables: any LLM key, optional `AUDIT_RATE` (default 0 for the demo), optional `DEMO_FAIL_RATE`.
- One worker only. State and timers are in memory, and a redeploy resets to the seeded demo state.
- The public URL is open to anyone. Do not share it before demo time. Keep a local copy running as backup.
- Stuck: read the Logs tab first, then post in #support on the Alternate Futures Discord with code link, error as text, and steps. Remove keys first.

---

## 11. Honest limits (say these before a judge finds them)

- The starting history is **seeded** for the demo. Real promotion on a higher risk class took roughly 100+ reviewed decisions in the simulation.
- Thresholds and risk weights are **provisional**, not calibrated on real owners.
- The guardrail checks that cited facts belong to the right party. It does not verify every claim in a draft.
- Reason codes assume the owner answers truthfully. An owner using "I'd rather do it myself" to politely reject weak drafts would inflate appropriateness.
- Not yet tested: the Docker build on Alternate Clouds, the dashboard in a browser, and your real automations wired in.

---

## 12. Judge Q&A

- **Isn't this just an approval workflow?** An approval workflow always asks. This decides when to ask from risk and a measured record, and explains why it asked.
- **Why not let an LLM decide when to ask?** The same action could route differently on different days, and a model could talk itself into a lower risk class. Routing is deterministic on purpose.
- **How do you handle prompt injection?** Every fact an agent cites must belong to the counterparty or the business. The poisoned email demo shows it. It does not prove every claim in a draft.
- **Is the data real?** The history is seeded and we say so. The live flip and refusals run for real.
- **What is next?** The Operations agent, richer PM and Marketing agents, owner elicitation of risk weights, and an evaluation against a static threshold baseline with real owners.
