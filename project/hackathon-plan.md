# Bizzii at Agentika 2.0: 24 Hour Sprint Plan

Theme: human in the loop automations.
Team of 2. Stack: all custom code. Python for the gate and server, your existing automations as executors, one small web page for approvals and dashboard. No n8n.

---

## 1. The pitch (say this first, every time)

> Every automation tool treats human in the loop as a fixed checkbox: always ask, or never ask. That wastes the owner's attention or risks a bad email to a client. Bizzii puts a Risk-Trust Gate in front of every action. The human is in the loop exactly as much as the evidence says they need to be, and that amount shrinks as the agent proves itself.

One line version: **autonomy that is earned from outcomes, not set at setup.**

The twist that wins: the gate separates "the agent is bad" from "the owner just prefers to do this themselves". Normal approval-rate gates can't tell those apart. Ours can, and says so on screen.

---

## 2. What already exists (declare this upfront)

Check the Agentika rules on pre-built work. If they judge only what is built at the event, say this in the first 20 seconds of the pitch and in the submission form:

- Existing before the event: onboarding, lead generation, outreach automation.
- Built at the event: the Risk-Trust Gate integration, approval loop with reason codes, outcome verification, guardrails, trust dashboard, demo scenarios.

Being upfront looks confident. Getting caught blurring it looks bad.

---

## 3. What to build (the whole list)

Already written and tested: `gate.py` (risk, floor rules, guardrail, Wilson measures, earned test, routing), `demo_sim.py` (the three-case comparison), `server.py` (FastAPI gate server, recall timers, seed and reset), `executors.py` (stubs you replace with your real automations) and `index.html` (approval queue, dashboard, scenario buttons). Everything below is what is left to wire and polish.

### Must build (no demo without these)

1. **Gate server.** Done in `server.py`. Endpoints: `POST /propose`, `POST /decision`, `GET /state`, `POST /reset`, `POST /scenario/{name}`. State saves to `state.json` on every write.
2. **Proposal contract.** Your lead and outreach code must call `POST /propose` with `agent`, `cls`, `counterparty`, `cited` (fact ids) and `payload` (email body, task fields, etc). The gate never reads the payload, only the class and the facts. If an LLM drafts the proposal, force structured JSON output.
3. **Fact store with IDs and owners.** Each fact has an id and belongs to a client or to the business. This is what the guardrail checks against. A Postgres table or even a JSON file is fine.
4. **Plug your automations into `executors.py`.** Replace the four stubs with calls into your real lead gen, outreach, CRM and task code. The server calls the executor on auto, after the recall timer, or after approval. Then point your lead and outreach code at `POST /propose` instead of sending directly.
5. **Approval page with 3 buttons.** Done in `index.html`: Approve, "Right, but I'd rather do it myself", "Wrong". The second button is the reason code that makes the whole contribution work. Optional: ping the owner with a link to the page by email or a Telegram bot message from your own code.
6. **Outcome verification.** Each executor must check its postcondition and return True or False; the server records it as the outcome. Email: delivered with no bounce. Task: exists with the right title, assignee, date. CRM update: the field holds the value and nothing else changed. If you can't verify, record nothing.
7. **Trust dashboard.** One page. Per class: route badge (Approval, Recall, Auto, Escalate), risk score, W/A/D bars against the threshold line, and the plain English "why" string from the gate.

### Should build (these make it win)

8. **Recall window with a live countdown and a Stop button.** Client follow-ups that have earned trust don't send instantly. They sit for a short window. Judges love a visible countdown.
9. **Poisoned inbound email demo.** An incoming email that tries to get the agent to quote another client's details. The agent cites the wrong fact id, the guardrail refuses it, the owner never sees it. Takes 10 minutes to stage and lands hard.
10. **Seed and reset buttons.** Seed loads a prepared decision history so classes are mid progress. Reset puts the demo back to the start in one click so you can rehearse and re-run.
11. **Audit log page.** Every decision with route, risk, measures and the reason. This answers the "is it explainable" question for free.

### Stretch (only if everything above is done and tested)

12. **Side by side panel:** pooled approval gate vs ours on the same history. Reuse the logic from `demo_sim.py`.
13. **"Delegate this class?" prompt** when A is high but D is low: "The agent is sound on follow-ups. Want it to handle these without asking?" This turns the diagnosis into an action.

### Do not build

The Operations agent, deeper PM and Marketing logic, full owner console, demotion polish, the evaluation chapter, multi-owner support, a login system. PM and Marketing exist only as three thin action classes (`assign_task`, `draft_content`, `publish_post`). Mention the rest as roadmap and move on.

---

## 4. Architecture

```
Inbound email / new lead
        |
   Your agent code (lead gen, outreach)
   LLM drafts: class + cited facts + payload
        |
   POST /propose  ->  GATE SERVER (server.py + gate.py)
        |              1. guardrail  -> refuse
        |              2. floor rule -> escalate
        |              3. risk + W/A/D vs threshold
        v
   route: refuse | escalate | approval | recall | auto
        |
   approval/escalate -> Approval page (3 buttons)
   recall            -> countdown, Stop button
   auto              -> straight through
        |
   executors.py (your real code) -> send email / write record / create task
        |
   verify postcondition -> POST /outcome  -> evidence updates -> dashboard
```

---

## 5. Action classes for the demo

| Class | Signature (target, effect, blast, reversibility) | Risk | Expected demo behaviour |
|---|---|---|---|
| create_task | teammate, create, one person, full | 0.20 | Earns auto live, flips on one more approval |
| update_crm | internal, modify, none, partial | 0.23 | Recall window after seeded history |
| send_followup | client, communicate, one person, partial | 0.53 | Still asks (not enough evidence yet) |
| cold_outreach | prospect, communicate, one person, partial | 0.60 | Always escalated by floor rule F2 until prior contact exists |

Your lead gen feeds cold_outreach. That is why the first email to a new lead always asks the owner, and the demo should say so out loud.

---

## 6. Seed data for the demo (label it as seeded)

- create_task: 5 clean approvals and outcomes already recorded. One more live approval crosses the minimum evidence line and the route flips from Approval to Auto on screen.
- update_crm: enough history to already be on Recall.
- send_followup: a decent record but not enough yet, still on Approval.
- cold_outreach: no history, escalated by F2.

Tune `TAU_MIN`, `TAU_MAX` and the seed counts so the create_task flip happens on the live approval. Test it five times in a row before you trust it. Say "this history is seeded for the demo" out loud. Real promotion at the high risk class takes roughly 100+ reviewed decisions in the simulation, and a judge who asks should get that honest answer.

---

## 7. 24 hour timeline (two people)

Person A is the backend and gate. Person B is the agent wiring, UI and demo. Swap if your strengths are the other way round.

| Hours | Person A | Person B |
|---|---|---|
| 0 to 1 | Run `server.py`, open the dashboard, click every scenario. Agree the proposal contract. | Same meeting. List the existing automations and where the gate plugs in. |
| 1 to 4 | Real fact store with ids and owners (replace the demo `FACTS`). Unit tests for refuse, escalate, earned. | LLM proposal step with structured output that calls `POST /propose`. |
| 4 to 8 | Tune thresholds and seed counts so the live flip lands. Persistence checks. | Replace each stub in `executors.py` with real code plus a postcondition check. |
| 8 to 12 | Real inbound email scenario and the poisoned email staged for real. | Owner notification link, approval page polish. |
| 12 to 14 | **Integration test together.** One full run: email in, gate, approval, execute, outcome, dashboard update. Fix everything that breaks. | Same. |
| 14 to 18 | Dashboard: route badges, W/A/D bars, why strings, audit log. | Recall countdown and Stop button. Seed values tuned. |
| 18 to 20 | **Sleep or rest in shifts.** Even 2 hours each. Tired demos fail. | |
| 20 to 22 | Reset button, rehearse the failure paths, add stretch items only if stable. | Write the demo script, record a backup video of a clean run. |
| 22 to 24 | Full rehearsal x3. Freeze code. | Submission form, README, slide or one pager. |

Rule: **feature freeze at hour 20.** After that you only fix bugs and rehearse.

---

## 8. Demo script (3 to 4 minutes)

1. **Hook (20s).** The pitch paragraph. Declare what existed before.
2. **Lead comes in (30s).** Your lead gen finds a prospect. Agent drafts outreach. Gate escalates it: floor rule F2, unsolicited contact. Show the "why" string. "No amount of trust unlocks this, by design."
3. **Task creation earns trust (40s).** Approve one more task creation live. The dashboard flips create_task from Approval to Auto. Next task goes through without asking.
4. **Client follow-up (40s).** Still asks, risk is higher and evidence is thin. Click "Right, but I'd rather do it myself". Explain that this is a different signal from "Wrong".
5. **Poisoned email (40s).** An inbound email tries to leak another client's details. Guardrail refuses it. The owner is never bothered and the agent is not penalised, because a guardrail doing its job is not evidence about competence.
6. **The closer (40s).** Dashboard or side by side panel: two cases with the same approval rate, one weak agent and one sound agent with a reluctant owner. A normal gate treats them identically. Ours says "agent is sound but owner prefers to do this personally".
7. **Close (10s).** "Human in the loop should be earned, measured, and shrinking. That is Bizzii."

Rehearse this until it runs without notes. Keep every step visible on one screen.

---

## 9. Likely judge questions and honest answers

- **"Isn't this just an approval workflow?"** No. An approval workflow asks every time. The gate decides when to ask, using risk and a measured track record, and tells you why it asked.
- **"How do you set the thresholds?"** They are provisional hyperparameters. Risk weights are fixed and explainable, not learned. Calibrating against real owners is future work.
- **"Why not let an LLM decide when to ask?"** Because then the same action can route differently on different days, and a model could talk itself into a lower risk class. Routing is deterministic on purpose.
- **"What about prompt injection?"** The guardrail checks that every fact the agent cites belongs to this client or the business. The poisoned email demo is exactly this. Be honest: it does not verify every claim in a draft, only the citations.
- **"Does it actually work or is it seeded?"** The history is seeded for the demo and we say so. The live flip and the refusal logic run for real.
- **"What if the owner lies on reason codes?"** Known limit. If an owner uses "I'd rather do it myself" to politely reject weak drafts, appropriateness gets inflated. Mitigation: ask two questions instead of one, or sample reason codes against independent review.

---

## 10. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Wiring from your automations to the gate breaks late | The dashboard scenario buttons fire the same proposals without them. Demo from those and show the real wiring as a bonus. |
| Live email fails on stage | Pre-recorded clean run as backup video. Use a test inbox, never a real client. |
| LLM returns bad JSON | Structured output with a schema and one retry. Hard fallback: a fixed canned proposal per scenario. |
| Wi-Fi at the venue is bad | Run everything locally. Hotspot as backup. |
| Dashboard not ready | Gate decisions printed in a clean terminal view is acceptable, but the dashboard is what makes it visual, so protect that time. |

---

## 11. Submission checklist

- [ ] Declared what existed before the event and what was built during it
- [ ] README with architecture diagram and how to run
- [ ] Demo video (backup of the clean run)
- [ ] Repo cleaned: no API keys, no real client data
- [ ] Reset and seed tested at least five times
- [ ] Test inbox and test recipients only
- [ ] Pitch rehearsed three times, under four minutes
- [ ] Both teammates can answer the Section 9 questions

---

## 12. Things not to claim

- Do not say it is proven safe. Say it is deterministic, auditable, and conservative by construction.
- Do not say thresholds are validated. They are provisional.
- Do not hide the seeded history.
- Do not imply the paper's evaluation is done. The gate is built and tested on a simulation, and a real owner study is future work.

---

## 13. Deploying on Alternate Clouds (from the Agentika guide)

- The app runs in a container. `Dockerfile` is included and serves on port **8000**. In the dashboard, open the Source tab and set **PORT = 8000**. A mismatch gives a Cloudflare 502.
- Order matters: set Variables first, then **Rebuild**, wait for success, then **Deploy**. Pushing to GitHub does neither.
- Put every key (Groq or other LLM key) in the Variables tab. Never commit `.env`. Read keys with `os.environ.get(...)` and fall back to the canned scenarios, so a missing key can't crash the app on startup (the KeyError trap).
- Keep one worker. State and recall timers are in memory, and a redeploy resets to the seeded demo state on purpose.
- Healthy logs show `Application startup complete`. Check the Logs tab before anything else.
- Deploy a first version in the first 2 hours, not at hour 22. Redeploy after every big change.
- The public URL is open: anyone with it can hit Reset. Share it with judges only at demo time.
- Confirm with the organizers whether custom FastAPI apps are fully allowed. The guide supports them, but it also describes n8n templates, so check the rules for anything that says n8n is required.
