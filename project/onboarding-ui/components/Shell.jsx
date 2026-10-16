/**
 * The topbar of a console screen.
 *
 * The sidebar is supplied once by the /app layout, so a screen only declares
 * its own heading. The `active` prop is accepted and ignored: the sidebar
 * works the current route out for itself.
 */
export default function Shell({ title, sub, right, children }) {
  return (
    <>
      <header className="topbar">
        <h1 className="display">{title}</h1>
        {sub ? <span className="sub">{sub}</span> : null}
        {right ? <div className="right">{right}</div> : null}
      </header>
      {children}
    </>
  );
}
