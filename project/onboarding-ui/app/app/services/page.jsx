import Shell from '../../../components/Shell';
import Anno from '../../../components/Anno';

export default function Services() {
  return (
    <>
      <Shell active="services" title="Connected services" sub="The accounts the agents work through">
        <div className="content narrow stack">
          <div className="card">
            <div className="card-head">
              <h2>Email — Gmail</h2>
              <div className="right">
                <span className="pill" style={{ borderColor: 'var(--route-auto)', color: 'var(--route-auto)' }}>
                  <span className="dot-m" style={{ background: 'var(--route-auto)' }} />
                  Connected
                </span>
              </div>
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-k">Account</div>
                <div className="meta-v" style={{ fontSize: 14 }}>ayesha@northlinestudio.com</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Notification renews</div>
                <div className="meta-v" style={{ fontSize: 14 }}>in 6 days</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Read up to</div>
                <div className="meta-v" style={{ fontSize: 14 }}>03 Oct 09:14</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Depends on it</div>
                <div className="meta-v" style={{ fontSize: 14 }}>Operations, Sales</div>
              </div>
            </div>
            <div className="card-body stack" style={{ gap: 13 }}>
              <p className="tiny faint" style={{ margin: 0 }}>
                The registration to be notified of changes is renewed daily rather than at the point
                of expiry, and a scheduled check asks the service directly what has changed since the
                last message recorded (§4.10.2).
              </p>
              <div>
                <button type="button" className="btn btn-danger btn-sm">Disconnect</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Task management</h2>
              <div className="right">
                <span className="pill" style={{ borderColor: 'var(--route-auto)', color: 'var(--route-auto)' }}>
                  <span className="dot-m" style={{ background: 'var(--route-auto)' }} />
                  Connected
                </span>
              </div>
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-k">Workspace</div>
                <div className="meta-v" style={{ fontSize: 14 }}>Northline Studio</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Progress read</div>
                <div className="meta-v" style={{ fontSize: 14 }}>03 Oct 08:40</div>
              </div>
              <div className="meta-cell">
                <div className="meta-k">Depends on it</div>
                <div className="meta-v" style={{ fontSize: 14 }}>Project Management</div>
              </div>
            </div>
            <div className="card-body">
              <button type="button" className="btn btn-danger btn-sm">Disconnect</button>
            </div>
          </div>

          <div className="notice danger">
            <span>
              <strong>Disconnecting deletes what came from that service.</strong> The stored keys and
              the data obtained from it are removed, any action awaiting approval that was formed
              from that data is withdrawn, and the agents depending on it are marked inactive
              (UC 4.6.4, §4.4.6).
            </span>
          </div>
        </div>
      </Shell>

      <Anno
        fig="4.8.14"
        name="Connected Services"
        covers={[
          'UC 4.6.3 Connect an External Account',
          'UC 4.6.4 Disconnect an External Account',
          '§4.10.2 notification renewed before it lapses',
        ]}
      />
    </>
  );
}
