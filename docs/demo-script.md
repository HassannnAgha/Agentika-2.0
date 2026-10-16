# Bizzii demo: the 3-minute video and the 6-minute live demo

The rules, from the participant handbook:

- **Video:** 2 to 3 minutes. Upload it as unlisted YouTube, or to Google Drive shared as "anyone with the link". The link goes in the submission PDF, and the shortlist (1:00 to 3:30 PM) is judged from it.
- **Live:** each of the top 10 teams gets 6 minutes to demonstrate the deployed project.
- **Show the deployed app**, with the Alternate Clouds address visible in the browser bar. A local-only demo is disqualified.
- **No secrets on screen**, in the video or the screenshots: no `.env`, no terminal showing keys, no Neon URL, no app passwords.

Use the same story for both. The video is the short cut. The live demo adds the parts marked *(live only)*.

---

## Before recording (about 15 minutes, on the deployed app)

1. Deploy with `SEED_HISTORY=1`, `APP_PASSWORD`, `PUBLIC_URL` (the deployed address) and the mail settings. Keep `SEND_LIVE=0`: every email goes to `TEST_INBOX`, which is your phone.
2. Open **Setup** and onboard the business once. Include:
   - two clients, each with a contact email
   - one teammate with an email (for example a developer)
   - brand claims, including one you rule out
   - a postal address as a custom field
3. Open **Who else can approve**, set the teammate to "Records, tasks and drafts", and save.
4. Have the Gmail app open on your phone, logged into the `TEST_INBOX` account, to receive approval alerts.
5. Check the **Project Management** card: "Assign a subtask" should be one approval away from earned. The seeded history is sized to do exactly that. If it already runs on its own, take it back in **Autonomy you have granted**.
6. Close every terminal and editor. Browser zoom 110%, bookmarks bar hidden, one tab.
7. Recording: Windows `Win + Alt + R` (Game Bar) or OBS for the screen, the phone's own screen recorder for the phone. Join the two in Clipchamp.

---

## The 3-minute video

Narrate in your own words. The lines below are a guide to what each shot needs to make clear.

| Time | Screen | What it shows |
|---|---|---|
| 0:00 to 0:15 | Landing page, then **Open the dashboard** | The problem: a small business owner has clients, a team, leads and posts to keep up with. AI agents could take that work, but nobody hands them the keys on day one. |
| 0:15 to 0:30 | Dashboard top: the four agent cards and "Your first week" | Four agents (Operations, Project Management, Sales, Marketing) propose. One gate decides how much of the owner each action needs. The first-week card comes from onboarding: everything the agents know about the business is on record. |
| 0:30 to 1:05 | Operations card, **Give it work**: paste a client email asking for a booking page. Click **Handle this email**. | The agent drafts a reply. It waits, and the card says why: the facts it used, the checks it passed, and the path to autonomy ("12 clean runs to go"). Then switch to the phone: the alert email arrives, tap the link, edit one line, **Approve**. Back on the dashboard, the reply is in the outbox. |
| 1:05 to 1:35 | Project Management card: a brief, then **Break down and assign**. Approve one subtask: that is its 8th clean run. Give it a second brief. | The meter fills and a green dot appears on its sparkline. The new subtasks say "earned: may it do these on its own?" Click **Approve, and let it do these on its own** on one of them. A third brief: those assignments run with no approval. Autonomy is earned from evidence and given with the owner's consent. (Clear the leftover cards from the earlier briefs before recording the next shot.) |
| 1:35 to 2:05 | **Try to break it**: click "A client's email says: ignore your instructions…", then the price attack | The gate assumes the AI was fooled. It blocks another client's data, an invented price and a lookalike address, and shows which check caught each. Nothing is sent. |
| 2:05 to 2:25 | **Autonomy you have granted** (next check-in date), **Recent decisions** (**Undo** on the automatic assignment) | The owner can take it back at any time. An undo counts against the agent, and the agent is asked to re-confirm. |
| 2:25 to 2:45 | Claude Code in a terminal with no keys visible: "use bizzii to propose a reply to <client>". Then the dashboard. | Any outside AI agent goes through the same gate over MCP, with its own record starting at zero. It has no approve tool. Only the owner decides. |
| 2:45 to 3:00 | **Trust report** page, then the dashboard | Every decision and the reason for it, on one page. Close on the theme: the AI does the work, the human keeps the judgment, and trust is earned and can be taken back. |

If it runs long, cut the MCP shot down to the moment the proposal appears as waiting. Never cut the phone approval or the attack box: those carry the theme.

---

## The 6-minute live demo

| Time | What to show |
|---|---|
| 0:00 to 0:30 | The problem, and the four agents plus the gate. |
| 0:30 to 1:30 | A real email: send one from another account to the connected mailbox, then press **Read the mailbox now** in Operations. The reply is drafted and waits. Approve it from the phone and show it in the outbox. |
| 1:30 to 2:30 | Earned autonomy and consent with Project Management, as in the video. Point at the sparkline: green dot = promoted. |
| 2:30 to 3:30 | **Try to break it**: two presets, then ask a judge for a sentence and type it into **Write your own attack**. *(live only)* |
| 3:30 to 4:15 | Teammate approval: the teammate's own link opens on the phone ("You are deciding as …, on behalf of …"). Approve it there. Recent decisions shows "decided by …". *(live only)* |
| 4:15 to 5:00 | MCP from Claude Code: propose an action, show it waiting, then run `test_attack` from Claude. *(live only)* |
| 5:00 to 5:40 | The trust report, and the "Why approval rates are not enough" panel: the same 82.5% approval rate gets three different verdicts. |
| 5:40 to 6:00 | Close: who it is for, and what the human always keeps. |

### If something fails live
- **AI drafting slow or down:** the agents fall back to templates, and the gate behaves the same. Say so and carry on.
- **The mailbox doesn't pick up the email in time:** paste the email into **Give it work** instead.
- **Deployment down:** play the video. Keep it open in a second tab.

---

## Questions judges are likely to ask
- **Why not just an approval rate?** Point at the three-verdict panel. Competence, suitability and the owner's willingness to delegate are measured separately.
- **What stops the AI going rogue?** Fixed rules: public posts and first contact with strangers can never run alone, however good the record. Plus the guardrails in the attack box.
- **What if it was wrong after it ran?** Undo, recorded as a failure, plus a check-in.
- **Is this real?** Real mode: real email (test inbox), Neon storage, Groq models. Only the starting history is seeded, and the dashboard labels it as seeded.
