/**
 * Report annotation strip.
 *
 * This is figure furniture, not part of the product interface: it names the
 * figure and marks the use cases and requirements the screen covers, so each
 * screenshot carries its own caption into section 4.8.
 */
export default function Anno({ fig, name, covers = [], actor = 'Owner' }) {
  return (
    <div className="anno">
      <span className="fig">
        Figure {fig} — {name}
      </span>
      <span className="sep">|</span>
      <span>Covers: {covers.join('  ·  ')}</span>
      <span className="actor">Actor: {actor}</span>
    </div>
  );
}
