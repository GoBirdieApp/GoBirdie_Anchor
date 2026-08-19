export default function Launcher() {
  return (
    <div className="app launcher">
      <header className="header launcher-header">
        <div>
          <p className="eyebrow">GoBirdie</p>
          <h1 style={{textAlign: 'center'}}>Anchor pipeline sandbox</h1>
         
        </div>
      </header>

      <div className="launcher-grid">
        <a className="launcher-card" href="/carry" target="_blank" rel="noopener noreferrer">
          <h2>Carry-only gate</h2>
          <p>
            Player stock yardages and handicap only. LPGA-PGA gradient, handicap shaping, physics solve for launch triple.
          </p>
          <span className="launcher-card-action">Open carry sandbox →</span>
        </a>

        <a className="launcher-card" href="/partial" target="_blank" rel="noopener noreferrer">
          <h2>Partial-data gate</h2>
          <p>
            Subset of Launch Monitor fields per club. Estimation validation, feasibility checks, optional direct LM merge.
          </p>
          <span className="launcher-card-action">Open partial sandbox →</span>
        </a>
      </div>
    </div>
  );
}
