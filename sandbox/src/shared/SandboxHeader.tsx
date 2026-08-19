import type { ReactNode } from 'react';

interface SandboxHeaderProps {
  gateLabel: string;
  title: string;
  subtitle: string;
  presets?: ReactNode;
}

export function SandboxHeader({ gateLabel, title, subtitle, presets }: SandboxHeaderProps) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">{gateLabel}</p>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        <a className="back-link" href="/">
          ← All sandboxes
        </a>
      </div>
      {presets ? <div className="presets">{presets}</div> : null}
    </header>
  );
}
