import React from 'react';
import { NAMED_TEMPLATES } from './data/templates';

export default function NamedTemplates({ onApply }) {
  return (
    <section>
      <Label>Templates</Label>
      <div className="flex flex-wrap gap-2">
        {NAMED_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onApply && onApply(t.patch)}
            className="rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 px-3 py-2 text-xs font-bold text-white transition hover:border-[#00FF62] hover:from-[#00FF62]/20 hover:to-[#00FF62]/5"
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Label({ children }) {
  return <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/50">{children}</div>;
}