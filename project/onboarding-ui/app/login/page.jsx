import Link from 'next/link';
import Anno from '../../components/Anno';
import Halftone from '../../components/Halftone';

export default function Login() {
  return (
    <main>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: 34,
            justifyContent: 'center',
          }}
        >
          <Link href="/" className="brand" style={{ padding: 0 }}>
            <span className="brand-mark" aria-hidden="true">B</span>
            <span className="brand-name" style={{ fontSize: 18 }}>Bizzii</span>
          </Link>

          <div style={{ maxWidth: 400 }}>
            <h1 className="display" style={{ fontSize: 46, margin: '0 0 10px' }}>Sign in</h1>
            <p className="dim" style={{ margin: 0, fontSize: 15 }}>
              The console has one account, held by the owner of the business.
            </p>
          </div>

          <form className="stack" style={{ gap: 16, maxWidth: 400 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" defaultValue="ayesha@northlinestudio.com" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" defaultValue="placeholder" />
            </div>
            <Link href="/app/queue" className="btn btn-primary" style={{ width: '100%' }}>
              Sign in
            </Link>
          </form>

          <div className="notice" style={{ maxWidth: 400 }}>
            <span>
              Employees hold no account. Approved work reaches the team through the external task
              management tool, as required by §4.4.6.
            </span>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            background: 'var(--band)',
            borderLeft: '1px solid var(--line)',
            minHeight: 420,
          }}
        >
          <Halftone />
          <div className="float-card" style={{ top: 'auto', bottom: 56 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>Waiting for you</div>
            <div style={{ fontSize: 15, marginBottom: 12 }}>
              7 actions, ordered by what they could cost
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill" style={{ borderColor: 'var(--route-escalate)', color: 'var(--route-escalate)' }}>
                <span className="dot-m" style={{ background: 'var(--route-escalate)' }} />
                2 escalated
              </span>
              <span className="pill mono">median 38s</span>
            </div>
          </div>
        </div>
      </div>

      <Anno
        fig="4.8.1"
        name="Sign In"
        covers={['UC 4.6.1 Sign In', '§4.4.6 only the owner may sign in']}
      />
    </main>
  );
}
