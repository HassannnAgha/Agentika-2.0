import Anno from '../../components/Anno';
import Halftone from '../../components/Halftone';

const BOXES = [
  { x: 30, y: 330, w: 190, h: 56, name: 'Sign In', fig: '4.8.1', hub: false },
  { x: 280, y: 60, w: 210, h: 52, name: 'Onboarding — Business', fig: '4.8.2' },
  { x: 280, y: 140, w: 210, h: 52, name: 'Onboarding — Services', fig: '4.8.3' },
  { x: 280, y: 320, w: 210, h: 76, name: 'Approvals Queue', fig: '4.8.4', hub: true },
  { x: 580, y: 40, w: 230, h: 52, name: 'Action Review', fig: '4.8.5' },
  { x: 580, y: 120, w: 230, h: 52, name: 'Escalated — Campaign', fig: '4.8.6' },
  { x: 580, y: 200, w: 230, h: 52, name: 'Marketing Draft', fig: '4.8.12' },
  { x: 580, y: 280, w: 230, h: 52, name: 'Project Confirmation', fig: '4.8.11' },
  { x: 580, y: 400, w: 230, h: 52, name: 'Recall Window', fig: '4.8.7' },
  { x: 580, y: 480, w: 230, h: 52, name: 'Activity Record', fig: '4.8.8' },
  { x: 860, y: 480, w: 190, h: 52, name: 'Action Detail', fig: '4.8.9' },
  { x: 580, y: 560, w: 230, h: 52, name: 'Agent Competence', fig: '4.8.10' },
  { x: 580, y: 640, w: 230, h: 52, name: 'Business Records', fig: '4.8.13' },
  { x: 580, y: 720, w: 230, h: 52, name: 'Connected Services', fig: '4.8.14' },
];

const SOLID = [
  'M 220 348 H 250 V 86 H 574',
  'M 385 112 V 134',
  'M 385 192 V 314',
  'M 220 368 H 274',
  'M 490 340 H 520 V 66 H 574',
  'M 490 350 H 534 V 146 H 574',
  'M 490 362 H 548 V 226 H 574',
  'M 490 372 H 562 V 306 H 574',
  'M 810 506 H 854',
];

const DASHED = [
  'M 390 396 V 426 H 574',
  'M 370 396 V 506 H 574',
  'M 350 396 V 586 H 574',
  'M 330 396 V 666 H 574',
  'M 310 396 V 746 H 574',
];

export default function Flow() {
  return (
    <main>
      <div className="ht-band pale">
        <Halftone variant="wave" tone="mono" cols={88} rows={10} fit="xMidYMid slice" />
        <span className="ht-label">Navigation</span>
      </div>
      <div className="content" style={{ padding: '28px 28px 100px' }}>
        <div className="stack" style={{ marginBottom: 20 }}>
          <h1 className="display" style={{ fontSize: 36, margin: 0 }}>
            Navigation flow — the owner
          </h1>
          <p className="dim" style={{ margin: 0, maxWidth: '70ch', fontSize: 14 }}>
            The owner is the system&rsquo;s only human actor, so there is one flow. Onboarding is
            reached on first use only; afterwards signing in opens the approvals queue, which is the
            console&rsquo;s home. Every decision screen returns to the queue once the action has been
            approved, rejected or stopped.
          </p>
        </div>

        <div className="card" style={{ padding: 20, overflowX: 'auto' }}>
          <svg
            viewBox="0 0 1080 800"
            width="100%"
            style={{ minWidth: 860, fontFamily: 'var(--font-ui)' }}
            role="img"
            aria-label="Navigation flow of the Bizzii owner console"
          >
            <defs>
              <marker
                id="arrow"
                orient="auto"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                markerUnits="strokeWidth"
              >
                <path d="M0 0 L6 3 L0 6 Z" fill="#A1A1A1" />
              </marker>
            </defs>

            {SOLID.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="#A1A1A1"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
            ))}
            {DASHED.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="#A1A1A1"
                strokeWidth="1.5"
                strokeDasharray="5 5"
                markerEnd="url(#arrow)"
              />
            ))}

            <text x="258" y="200" fontSize="12" fill="#737373" textAnchor="middle">
              first use
            </text>
            <text x="248" y="362" fontSize="12" fill="#737373" textAnchor="middle">
              returning
            </text>

            {BOXES.map((b) => (
              <g key={b.fig + b.name}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="8"
                  fill={b.hub ? '#0A0A0A' : '#FFFFFF'}
                  stroke={b.hub ? '#0A0A0A' : '#E5E5E5'}
                  strokeWidth="1"
                />
                <text
                  x={b.x + b.w / 2}
                  y={b.y + b.h / 2 - 3}
                  fontSize="13.5"
                  fontWeight="500"
                  fill={b.hub ? '#FFFFFF' : '#0A0A0A'}
                  textAnchor="middle"
                >
                  {b.name}
                </text>
                <text
                  x={b.x + b.w / 2}
                  y={b.y + b.h / 2 + 14}
                  fontSize="11"
                  fill={b.hub ? '#B9BCC0' : '#737373'}
                  textAnchor="middle"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {b.fig}
                </text>
              </g>
            ))}

            {/* legend */}
            <g>
              <path d="M 30 470 H 86" stroke="#A1A1A1" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
              <text x="30" y="494" fontSize="12" fill="#525252">
                Follows from an action
              </text>
              <path
                d="M 30 530 H 86"
                stroke="#A1A1A1"
                strokeWidth="1.5"
                strokeDasharray="5 5"
                markerEnd="url(#arrow)"
                fill="none"
              />
              <text x="30" y="554" fontSize="12" fill="#525252">
                Reached from the sidebar
              </text>
              <text x="30" y="590" fontSize="12" fill="#525252">
                at any time
              </text>
            </g>
          </svg>
        </div>

        <p className="tiny faint" style={{ marginTop: 14, maxWidth: '80ch' }}>
          Employees appear nowhere in this flow. They receive and update their work in the external
          task management tool and hold no account in the console (§4.4.6, UC 4.6.1 alternative
          flow 1-A).
        </p>
      </div>

      <Anno
        fig="4.8.15"
        name="Navigation Flow"
        covers={['Owner navigation across all screens', '§4.4.6 the owner is the only user']}
      />
    </main>
  );
}
