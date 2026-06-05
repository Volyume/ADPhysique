'use client';

import { useEffect, useState } from 'react';

const KEY = 'volyume.a11y';

interface Prefs {
  contrast: boolean;
  cvd: boolean;
}

function apply(p: Prefs) {
  const el = document.documentElement;
  if (p.contrast) el.setAttribute('data-contrast', 'high');
  else el.removeAttribute('data-contrast');
  if (p.cvd) el.setAttribute('data-cvd', 'safe');
  else el.removeAttribute('data-cvd');
}

function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-md border-t border-borderSubtle py-md first:border-t-0">
      <div className="min-w-0">
        <p className="type-body text-textPrimary">{label}</p>
        <p className="type-caption text-textMuted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-state ease-standard motion-reduce:transition-none ${
          on ? 'bg-primaryFill' : 'bg-surface3'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-textPrimary transition-all duration-state ease-standard motion-reduce:transition-none ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

// Higher-contrast and colour-blind-safe swaps, mirroring the mobile
// accessibility toggles. They override the token CSS variables at the document
// root (see globals.css) and persist locally to this browser.
export function AccessibilitySettings() {
  const [prefs, setPrefs] = useState<Prefs>({ contrast: false, cvd: false });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
      setPrefs({ contrast: !!saved.contrast, cvd: !!saved.cvd });
    } catch {
      /* default prefs */
    }
  }, []);

  useEffect(() => {
    apply(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable */
    }
  }, [prefs]);

  return (
    <div className="flex flex-col">
      <Toggle
        on={prefs.contrast}
        onToggle={() => setPrefs((p) => ({ ...p, contrast: !p.contrast }))}
        label="Higher contrast"
        hint="Lifts secondary text and borders for easier reading."
      />
      <Toggle
        on={prefs.cvd}
        onToggle={() => setPrefs((p) => ({ ...p, cvd: !p.cvd }))}
        label="Colour-blind safe"
        hint="Swaps the success and error colours for distinguishable ones."
      />
    </div>
  );
}
