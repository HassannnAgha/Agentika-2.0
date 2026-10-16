import Sidebar from '../../components/Sidebar';

export default function ConsoleLayout({ children }) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">{children}</div>
    </div>
  );
}
