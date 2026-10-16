/**
 * One public port. Next serves the onboarding wizard (and its Gemini import routes under /api/onboarding/*).
 * Everything that belongs to the Bizzii gate, lead gen and the approvals dashboard is proxied to the
 * Python server running beside it in the same container.
 */
const GATE = process.env.GATE_URL || 'http://127.0.0.1:8001';

const toGate = [
  ['/gate', '/'],                       // approvals dashboard
  ['/leads', '/leads'],                 // lead generation page
  ['/static/:path*', '/static/:path*'],
  ['/state', '/state'],
  ['/scenario/:name', '/scenario/:name'],
  ['/decision', '/decision'],
  ['/propose', '/propose'],
  ['/reset', '/reset'],
  ['/health', '/health'],
  ['/api/profile', '/api/profile'],
  ['/api/facts', '/api/facts'],
  ['/api/catalogue', '/api/catalogue'],
  ['/api/leads', '/api/leads'],
  ['/api/leads/:path*', '/api/leads/:path*'],
  ['/api/outbox', '/api/outbox'],
  ['/api/audit', '/api/audit'],
  ['/api/agents/:path*', '/api/agents/:path*'],
  ['/api/team', '/api/team'],
  ['/a/:token', '/a/:token'],
  ['/mcp', '/mcp'],
  ['/mcp/:path*', '/mcp/:path*'],
  ['/api/alerts', '/api/alerts'],
  ['/api/supervision', '/api/supervision'],
  ['/api/consent', '/api/consent'],
  ['/api/actions/:path*', '/api/actions/:path*'],
  ['/api/learning', '/api/learning'],
  ['/api/train', '/api/train'],
  ['/api/train/:path*', '/api/train/:path*'],
  ['/api/trust/:path*', '/api/trust/:path*'],
  ['/api/impact', '/api/impact'],
  ['/api/blocked', '/api/blocked'],
  ['/api/digest/:path*', '/api/digest/:path*'],
  ['/api/email/:path*', '/api/email/:path*'],
  ['/api/sales/:path*', '/api/sales/:path*'],
  ['/u/:token', '/u/:token'],           // unsubscribe link in outbound email
  ['/api/tasks', '/api/tasks'],
  ['/api/tasks/:path*', '/api/tasks/:path*'],
  ['/api/demo/:path*', '/api/demo/:path*'],
  ['/api/compare', '/api/compare'],
  ['/api/inbox/:path*', '/api/inbox/:path*'],
  ['/api/jira/:path*', '/api/jira/:path*'],
  ['/api/console/:path*', '/api/console/:path*'],
  ['/agents', '/agents'],               // throwaway test harness page for the agents
  ['/docs', '/docs'],                   // FastAPI interactive API docs
  ['/openapi.json', '/openapi.json'],
  ['/api/storage', '/api/storage'],
  ['/api/autonomy', '/api/autonomy'],    // how close each agent is to acting alone
  ['/api/redteam', '/api/redteam'],      // "try to break it": attacks run through the real gate, nothing sent
  ['/api/approvers', '/api/approvers'],  // teammates the owner delegates decisions to
  ['/api/plan/:path*', '/api/plan/:path*'],
  ['/api/report.csv', '/api/report.csv'],
  ['/report', '/report'],                // printable trust report
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return { beforeFiles: toGate.map(([source, dest]) => ({ source, destination: `${GATE}${dest}` })) };
  },
};

export default nextConfig;
