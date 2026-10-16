/**
 * Captures a full-page screenshot of every Bizzii screen for section 4.8.
 *
 * Console screens get Report mode switched on first, so each one carries its
 * figure number and the use cases it covers in the strip at the foot of the
 * page — the same strip a reader sees if they open the page themselves.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'https://bizzii-ui.vercel.app';
const OUT = process.argv[3] || '../fyp-screenshots';

mkdirSync(OUT, { recursive: true });

const PAGES = [
  // landing + auth — no report strip, these are not numbered figures
  { path: '/', file: '00-landing.png', report: false },
  { path: '/login', file: '01-login.png', report: true },
  { path: '/onboarding', file: '02a-onboarding-fit.png', report: true },
  { path: '/onboarding/import', file: '02e-onboarding-import.png', report: true },
  { path: '/onboarding/business', file: '02-onboarding-business.png', report: true },
  { path: '/onboarding/team', file: '02b-onboarding-team.png', report: true },
  { path: '/onboarding/clients', file: '02c-onboarding-clients.png', report: true },
  { path: '/onboarding/brand', file: '02d-onboarding-brand.png', report: true },
  { path: '/onboarding/services', file: '03-onboarding-services.png', report: true },
  { path: '/onboarding/review', file: '03a-onboarding-review.png', report: true },

  // console
  { path: '/app', file: '04-dashboard.png', report: true },
  { path: '/app/queue', file: '05-approvals-queue.png', report: true },
  { path: '/app/review', file: '06-action-review.png', report: true },
  { path: '/app/escalated', file: '07-escalated-campaign.png', report: true },
  { path: '/app/recall', file: '08-recall-window.png', report: true },
  { path: '/app/clients', file: '09-clients.png', report: true },
  { path: '/app/memory', file: '10-memory.png', report: true },
  { path: '/app/projects', file: '11-projects.png', report: true },
  { path: '/app/tasks', file: '12-tasks.png', report: true },
  { path: '/app/team', file: '13-team.png', report: true },
  { path: '/app/leads', file: '14-leads.png', report: true },
  { path: '/app/campaigns', file: '15-campaigns.png', report: true },
  { path: '/app/marketing', file: '16-marketing-draft.png', report: true },
  { path: '/app/brand', file: '17-brand-material.png', report: true },
  { path: '/app/agents', file: '18-agent-competence.png', report: true },
  { path: '/app/activity', file: '19-activity.png', report: true },
  { path: '/app/activity/detail', file: '20-activity-detail.png', report: true },
  { path: '/app/services', file: '21-connected-services.png', report: true },
  { path: '/flow', file: '22-navigation-flow.png', report: true },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const p of PAGES) {
  await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });

  if (p.report) {
    // flip the Report mode toggle on if it isn't already
    const pressed = await page.locator('.anno-toggle').getAttribute('aria-pressed').catch(() => null);
    if (pressed !== 'true') {
      await page.locator('.anno-toggle').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(150);
    }
  }

  // let web fonts and the halftone image settle
  await page.waitForTimeout(350);

  await page.screenshot({ path: `${OUT}/${p.file}`, fullPage: true });
  console.log('captured', p.file);
}

await browser.close();
console.log(`\n${PAGES.length} screenshots written to ${OUT}`);
