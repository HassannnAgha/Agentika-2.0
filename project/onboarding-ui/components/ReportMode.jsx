'use client';

import { useEffect, useState } from 'react';

/**
 * Switches the figure captions on and off.
 *
 * Off by default, so the console reads as the product. Switched on, every
 * screen shows the strip naming its figure and the use cases it covers, which
 * is what section 4.8 is captured with.
 */
export default function ReportMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let saved = null;
    try {
      saved = window.localStorage.getItem('bizzii.anno');
    } catch (e) {
      saved = null;
    }
    if (saved === 'on') setOn(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-anno', on ? 'on' : 'off');
    try {
      window.localStorage.setItem('bizzii.anno', on ? 'on' : 'off');
    } catch (e) {
      /* a viewer with site data blocked simply loses the preference */
    }
  }, [on]);

  return (
    <button
      type="button"
      className="anno-toggle"
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
    >
      <span className="sw" />
      Report mode
    </button>
  );
}
