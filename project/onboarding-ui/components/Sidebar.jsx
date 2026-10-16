'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ReportMode from './ReportMode';

const NAV = [
  {
    label: 'Overview',
    items: [{ href: '/app', name: 'Dashboard', exact: true }],
  },
  {
    label: 'Decisions',
    items: [
      { href: '/app/queue', name: 'Approvals', count: '7' },
      { href: '/app/escalated', name: 'Escalated', count: '2', alert: true },
      { href: '/app/recall', name: 'Recall window', count: '1' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/app/clients', name: 'Clients', count: '4' },
      { href: '/app/projects', name: 'Projects', count: '3' },
      { href: '/app/tasks', name: 'Tasks', count: '18' },
      { href: '/app/team', name: 'Team', count: '5' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/app/leads', name: 'Leads', count: '61' },
      { href: '/app/campaigns', name: 'Campaigns', count: '2' },
      { href: '/app/marketing', name: 'Marketing drafts' },
      { href: '/app/brand', name: 'Brand material' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/app/memory', name: 'Memory' },
      { href: '/app/agents', name: 'Agents' },
      { href: '/app/activity', name: 'Activity' },
      { href: '/app/services', name: 'Connected services' },
    ],
  },
];

const isActive = (path, item) =>
  item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // a tap on a link navigates; close the menu so the page beneath is visible
  useEffect(() => {
    setOpen(false);
  }, [path]);

  const current =
    NAV.flatMap((g) => g.items).find((i) => isActive(path, i))?.name ?? 'Menu';

  return (
    <aside className="sidebar" data-open={open ? 'true' : 'false'}>
      <div className="mobile-bar">
        <Link href="/app" className="brand">
          <span className="brand-mark" aria-hidden="true">B</span>
          <span className="brand-name">Bizzii</span>
        </Link>

        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="app-nav"
          aria-label={open ? 'Close the menu' : `Open the menu — currently on ${current}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="menu-current">{current}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            {open ? (
              <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M2 4 H14 M2 8 H14 M2 12 H14" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div className="nav-groups" id="app-nav">
        {NAV.map((group) => (
          <nav className="nav" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item"
                aria-current={isActive(path, item) ? 'page' : undefined}
              >
                {item.name}
                {item.count ? (
                  <span className={item.alert ? 'count alert' : 'count'}>{item.count}</span>
                ) : null}
              </Link>
            ))}
          </nav>
        ))}

        <div className="sidebar-foot stack" style={{ gap: 12 }}>
          <ReportMode />
          <div className="owner-chip">
            <span className="owner-av" aria-hidden="true">AR</span>
            <span>
              <span className="owner-name" style={{ display: 'block' }}>Ayesha Raza</span>
              <span className="owner-role">Owner · Northline Studio</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
