# Bizzii demo video guide (2 to 3 minutes)

Deadline: **17 Oct, 1:50 PM PKT**. The organisers want the **live Alternate Clouds deployment** in the video, and it must show **where the human steps in**.
Practise on local first (links below), then record on the live URL once deployments are allowed again.

## Links

| What | Local (practice) | Live (record this) |
|---|---|---|
| Live day (main demo page) | http://localhost:8000/live | https://bizzii-app.alternatefutures.ai/live |
| Dashboard (trust per agent) | http://localhost:8000/gate | https://bizzii-app.alternatefutures.ai/gate |
| Leads | http://localhost:8000/leads | https://bizzii-app.alternatefutures.ai/leads |
| Trust report | http://localhost:8000/report | https://bizzii-app.alternatefutures.ai/report |
| Jira board (project KAN) | https://aghahassan637.atlassian.net/jira/software/projects/KAN/list | same |
| Gmail inbox (where every email lands) | https://mail.google.com | same |

Live login: user `judge`, password = `APP_PASSWORD` in `project/.env`. Local needs no login.

## Agent colours (same on lanes, approval cards and the gate feed)

- **Blue = Sales**: finds clinics, scores fit, writes first emails
- **Green = Operations**: reads client mail, drafts replies, flags risk, blocks attacks
- **Purple = Project Management**: plans work, assigns by skill, files issues in Jira
- **Orange = Marketing**: writes posts in the brand voice, asks to publish

## Before you hit record

1. Open 3 tabs in this order: **/live**, **Jira KAN list**, **Gmail**. Zoom the browser to 90% so all four lanes fit.
2. On /live click **Reset demo** (top right) once, then reload. All lanes should say *Idle* and "Needs you" should be empty.
3. Close other tabs and notifications. Record the browser window (OBS, or Chrome's screen recorder) with your voice.
4. Do one full practice run first: the AI calls take 5 to 10 seconds each, so you know where to pause and talk.

## Script (about 2:40)

### 1. Problem, 0:00 to 0:15 (on /live, nothing clicked yet)
> "Small agencies drown in admin: leads, client emails, planning, posting. AI agents can do this work, but you can't hand them your clients blindly. Bizzii lets agents **earn** autonomy from evidence, and keeps the human exactly where it matters."

### 2. The day starts, 0:15 to 1:05: click **▶ Start the day**
Talk over the lanes as they fill in. Don't click anything else yet.
- **Sales (blue)**: "Sales searches public listings for clinics in Lahore, scores each one with a transparent rubric, and writes a first email using only facts it found." Point at the gate line: **"Always yours: first contact with a stranger is never automatic."**
- **Operations (green)**: "Omar, a real client, is upset: a delay, a 15% discount request, and new work." Point at the draft: **"It refused to promise a discount or a date, because none is on record in writing, and it tells me how confident it is and what it's unsure about."** It also flags Meridian as at risk.
- **Project Management (purple)**: "The careers page becomes a plan: subtasks matched to each teammate's skills and capacity, ready for Jira."
- **Marketing (orange)**: "It writes a post in our brand voice. Drafting is earned, so it just happens. **Publishing is public and can't be undone, so it is always mine.**"
- **Attack (green, last)**: "Someone tries to make it leak another client's details. The guardrail **blocks** it before anyone sees it."

### 3. The human in the loop, 1:05 to 2:25 (right-hand "Needs you" panel)
Do these four, in this order:

1. **Omar's reply (green card)**: click **Edit, then approve**, change one sentence (e.g. add "I'll send you a new timeline by Monday"), click **Approve my version**.
   > "I fix the draft myself. That's recorded as its own signal, and the agent learns my style from it."
   Switch to **Gmail**: show the reply that just arrived (`[TEST for omar@meridian.example] Re: Homepage delay`). Switch back.
2. **Assign a subtask (purple card)**: click **Approve**. Watch the purple lane: **"Created in Jira: KAN-…"**, then **"🎉 Trust earned"**, then the next subtask is **filed in Jira without asking**.
   > "One more clean result, and Project Management has earned the right to assign on its own, for this action only."
   Switch to **Jira**: show the new issues at the top of KAN. Switch back.
3. **First contact with leads (blue card)**: click **Approve**.
   > "Outreach always needs me. In test mode the emails come to my inbox, never to the real business."
   (Optional: flash Gmail to show the outreach emails.)
4. **Publish a post (orange card)**: click **I'd rather do it myself**.
   > "The agent was right, I just want to post this one myself. That's a different signal from 'wrong', and Bizzii keeps them apart."

### 4. Close, 2:25 to 2:40
Optional: open **/gate** for one second to show the trust meters per agent.
> "Human in the loop should be earned, measured and shrinking. That's Bizzii, live on Alternate Clouds."

## If something goes wrong while recording
- A lane says "Failed": click **Reset demo**, reload, start again (that's why you rehearse once).
- AI is slow: keep talking about what the gate is checking. Nothing is pre-recorded, so a pause is fine.
- "Needs you" has many cards: you only need the four above. Ignore the rest.
- Per-lane buttons (**Sales**, **Operations**, **Project Management**, **Marketing**, **Try to break it**) re-run a single agent if you want a retake of one part.

## After recording
- Upload as **YouTube Unlisted** or **Google Drive, Anyone with the link**. Open the link in a private window to check it plays.
- Put the link, the live URL, the judge login and the GitHub link in the submission PDF, and open each one before you submit.
