# Bizzii API (what a UI binds to)

Everything is JSON. In the deployed container one port serves it all (Next proxies to FastAPI); locally FastAPI is on
`:8001` and sends CORS headers for `localhost`. Interactive docs: `/docs`. All paths below are same-origin.

## The one idea: propose, route, decide
Every agent action is a **proposal**. The gate returns a **route** and a plain-English `why`. Nothing runs until the route says so.

| route | meaning | status afterwards |
|---|---|---|
| `refuse` | guardrail failed (cites no fact, or a fact owned by someone else, or the agent is inactive). Owner never sees it, no counter moves | `refused` |
| `escalate` | floor rule (F1 public and irreversible, F2 first contact with a stranger, F3 reaches everyone, F4 permanent delete). Never earnable | `awaiting` |
| `approval` | not enough verified evidence yet | `awaiting` |
| `recall` | earned, but not fully reversible: runs after a short window unless stopped | `recall` then `executed` |
| `auto` | earned and fully reversible | `executed` |

### Proposal contract: `POST /propose`
```json
{ "agent": "sales", "cls": "send_lead_outreach", "counterparty": "ld-3f2a1c",
  "cited": [10004, 10005], "payload": {"to": "x@y.com", "subject": "...", "body": "..."},
  "prior_contact": false, "who": "optional display name" }
```
Returns the action: `{id, agent, cls, label, counterparty, who, payload, cited, facts[], decision{route, risk, why, W, A, D, tau, nW}, status}`.
`cls` is one of the 22 FYP classes or `publish_post` (hackathon extension): see `GET /api/catalogue`.

### Owner decision: `POST /decision`
`{"id": 7, "kind": "approve" | "preference" | "quality"}`. `preference` = "right, but I'd rather do it myself"; `quality` = "wrong".
They are separate counters: that separation is the point. Allowed while status is `awaiting` or `recall` (409 otherwise). During `recall`
only `preference`/`quality` make sense (Stop). Approve executes the action and records a **verified outcome** (true/false/null).

## Gate state
- `GET /state` -> `{classes[], pending[], recent[], log[], business, profile_source, agents{}, agent_names{}, llm}`.
  `classes[]` has per class: `label, agent, risk, tau, n_min, earned, why, W, A, D, nW, counts{a,rp,rq,ok,fail}, sig, floor`. `pending[]` includes `secs_left` for recall.
- `GET /api/catalogue` -> every class with `agent`, `needs` (external accounts), `ceiling` (`automatic|recall|escalation`).
- `GET /api/audit?n=60` -> append-only trail, newest first: `{t, event: proposed|owner_approve|owner_preference|owner_quality|executed, id, cls, label, who, agent, route, risk, why, verified?}`.
- `GET /api/outbox` -> emails written (never sent to the intended address unless it is the test inbox). `GET /api/storage` -> `{"backend":"postgres"|"files"}`.
- `POST /reset?seed=true&full=false` -> reset gate evidence (seeded demo history). `full=true` also resets profile, leads, outbox, audit.

## Onboarding -> business memory
- `POST /api/profile` takes the wizard's fixture JSON (`fixture_version 2`): `business{name,category,description,owner{name,email},working_days,working_hours,timezone}`,
  `team[{id,name,role,email,skills[],weekly_capacity_hours}]`, `clients[{id,name,contact{name,email},status active|past|prospect,relationship_start,last_contact,custom[]}]`,
  `brand{voice,positioning,permitted_claims[{text}],prohibited_claims[{text}]}`, `connections{email,task_tool}{status}`.
  It becomes the memory the guardrail checks. A declined connection makes that agent **inactive**: its proposals are refused with the reason.
- `GET /api/profile`, `GET /api/facts` (every fact with `id`, `owner`, `kind`, `text`), `GET /api/team`.

## Agents (each builds proposals and submits them; response is a list)
Item: `{id, cls, label, agent, who, route, why, status, payload, facts[]}`. Approving an action runs its executor, which changes real state
(the persisted task tool, CRM, memory, brand record, outbox) and **verifies the postcondition**. Some executed actions set the next step in motion
as NEW proposals that go through the gate again; they come back in the action as `followups: [ids]`.

**Operations**
- `POST /api/agents/ops/inbound` `{sender, subject, body, attachments:[{name, text? | content_b64?}]}` returns, as applicable:
  `reply_to_client` (recorded sender) or `reply_to_enquiry` (stranger who wrote first: not F2), `flag_relationship_risk` if they sound upset,
  `read_attached_document` per readable file (PDF, DOCX, TXT, MD, CSV), `record_correspondence_fact` (dates, amounts, agreements the message states; becomes memory owned by that client only after approval),
  `update_client_record` (only when the sender IS the recorded contact address and gives a new one), `identify_project` (recorded client asking for new work).
  An attachment it cannot read produces `notify_owner_unread_file` to the owner and **no reply is proposed**.
- `POST /api/agents/ops/scan?days=14` flags and chases clients that have gone quiet.
- `POST /api/inbox/poll` reads unseen mail over IMAP and feeds each message through the above (409 until `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD` are set; polls every 60 s once configured). Automated mail, our own address and repeats are skipped. `GET /api/inbox/status`.

**Project Management**
- `POST /api/agents/pm/plan` `{client_id, brief}` -> `decompose_project` + an `assign_subtask` per subtask, assignee chosen from recorded skills and remaining weekly capacity (open work counts against it).
- Approving `identify_project` chains into that plan automatically. Approving an assignment chains into `notify_teammate_assignment` (seeded as earned, so it runs on its own).
- `POST /api/agents/pm/stalled?days=7` finds open tasks with no progress and proposes `reassign_stalled_task`; approving really changes the task's assignee. 409 if nothing is stalled.
- The task tool is simulated and persisted: `GET /api/tasks`, `POST /api/tasks/{id}/status` `{status: open|in_progress|complete}` (what teammates do outside Bizzii), `POST /api/demo/age_tasks?days=10` (demo helper).

**Sales** (see also the lead section)
- `POST /api/agents/sales/campaign` `{lead_ids?, name?}` -> ONE `send_lead_outreach` proposal covering every ready lead (escalated by F2): one owner decision. Each message is guardrail-checked against its own recipient (`items`), so one lead's facts cannot ride in another's email. Skips opted-out, already-approached and email-less leads; honours `CAMPAIGN_DAILY_CAP` (default 25). A declined campaign makes its leads eligible again.
- `POST /api/leads/{id}/optout` suppresses the address for every later send. `POST /api/leads/{id}/followup` (only after the first email was sent; F2 holds it again).

**Marketing**
- `POST /api/agents/marketing/draft` `{topic, channel}` -> `draft_content` from permitted claims, with a deterministic claims check (guarantees, superlatives, promised results, prices, naming a client). `payload.claims_check` is `"clean"` or the issues; an AI draft that fails is revised once, then replaced by the template.
- `POST /api/agents/marketing/publish` `{text, channel}` -> `publish_post`, always escalated (F1+F3). `POST /api/agents/marketing/retain` `{text, topic}` -> `retain_approved_content`.
- `POST /api/agents/marketing/brand` `{voice?, positioning?, add_permitted[], add_prohibited[]}` -> `update_brand_record`; approving it edits the recorded brand, and the claims and the guardrail's memory change with it. Fact ids stay stable across the edit.

AI drafting uses Groq when `GROQ_API_KEY` is set; otherwise a deterministic template (`payload.draft_by` says which).

## The closer
`GET /api/compare?n=200` -> three simulated (agent, owner) pairs with the same expected approval rate: pooled-approval gate verdict vs this gate's verdict and diagnosis. A simulation, not owner data.
`GET /state` classes also carry `suggest_delegate` (text or null): set when the agent is sound on outcomes and appropriateness and only the owner's preference holds it back.

## Sales / lead generation
- `GET /api/leads` (best fit first), `POST /api/leads/discover` `{keyword, geo, limit}`, `POST /api/leads/add` `{website, category}`,
  `POST /api/leads/{id}/draft`, `POST /api/leads/{id}/propose` (the drafted first email as `send_lead_outreach`; 409 if the address opted out).
- Lead: `{id, name, category, address, website, email, phone, signals, score, reasons[], status new|enriched|drafted|proposed, sample, draft{subject,body,cited,by}}`.

## Console API: one endpoint per page of the owner console (`fyp2/bizzii-ui`, `/app/*`)
Each returns the shape that page renders from hard-coded data today, so the UI swaps its constants for a fetch.
Vocabulary is the UI's own: `route` = `automatic|recall|approval|escalation`; `risk` = `low|moderate|high|critical`; outcome = `Successful|Unsuccessful|Not yet observed`.
Refused proposals never reach the owner, so none of these pages list them.

| UI page | Endpoint | Shape |
|---|---|---|
| Approvals queue `/app/queue` | `GET /api/console/queue` | `{waiting, escalated, items[{id, ref "A-0007", agent, action, risk, score, route, expires, rule}]}`, escalations first, then risk descending |
| Review / Recall / Escalated / Marketing detail | `GET /api/console/actions/{id}` | queue item plus `who, payload, why, facts[{id "F-12", statement, source}], consequence, recall_secs_left, competence{lower, successes, outcomes, required, met}, decisions{approved, prefer_own, wrong}`, and `lead{}` for outreach |
| Agents `/app/agents` | `GET /api/console/agents` | `[{name, key, classes[{c, s, n, lower, req, route}]}]`, kinds never attempted are omitted |
| Activity `/app/activity` | `GET /api/console/activity` | `{count, rows[{ref, when, agent, action, route, outcome}]}`: only what ran without asking |
| Clients | `GET /api/console/clients` | `{count, at_risk, clients[{id, n, e, contact, s Active/At risk/Past, last, proj, open}]}` |
| Team | `GET /api/console/team` | `{team[{n, r, e, skills[], capacity, open, done}]}` |
| Tasks | `GET /api/console/tasks` | `{tasks[{t, p, a, s, ref, due, reason}]}` (what executed `assign_subtask` actions created) |
| Projects | `GET /api/console/projects` | `{projects[{n, c, s Confirmed/Awaiting confirmation, tasks, subtasks[], action_id?}]}` |
| Leads | `GET /api/console/leads` | `{leads[{id, n, e, c, l, src, st, score, sample}]}` |
| Campaigns | `GET /api/console/campaigns` | `{awaiting[{id, ref, to, email}], sent[{n, at, st}], held_by}` |
| Memory | `GET /api/console/memory` | `{messages_recorded, facts_drawn, messages[{id, from, subj, facts, ok, enquiry}], facts[{id, statement, owner, kind}]}` |
| Brand | `GET /api/console/brand` | `{voice, positioning, claims[{c, used}], prohibited[]}` |
| Services | `GET /api/console/services` | `{services[{key, name, status, simulated}]}` |

Actions are decided with `POST /decision` (`approve|preference|quality`), exactly as above.

## Demo scenarios
`POST /scenario/{new_lead|task|crm|followup|assign|draft|publish|poisoned}` builds a proposal from the live profile. `poisoned` cites another client's fact and must be `refuse`.
