/**
 * Captures the main pages only — the ones that carry the product's shape —
 * for dropping straight into the report.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'https://bizzii-ui.vercel.app';
const OUT = process.argv[3] || '../fyp-screenshots';

mkdirSync(OUT, { recursive: true });

const PAGES = [
  { path: '/', file: '01-landing-page.png', report: false },
  { path: '/login', file: '02-sign-in.png', report: false },
  { path: '/app', file: '03-dashboard.png', report: false },
  { path: '/app/queue', file: '04-approvals-queue.png', report: false },
  { path: '/app/review', file: '05-action-review.png', report: false },
  { path: '/app/escalated', file: '06-escalated-campaign.png', report: false },
  { path: '/app/recall', file: '07-recall-window.png', report: false },
  { path: '/app/agents', file: '08-agent-competence.png', report: false },
  { path: '/app/activity', file: '09-activity.png', report: false },
  { path: '/flow', file: '10-navigation-flow.png', report: false },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const p of PAGES) {
  await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${p.file}`, fullPage: true });
  console.log('captured', p.file);
}

await browser.close();
console.log(`\n${PAGES.length} screenshots written to ${OUT}`);
