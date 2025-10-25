// --- START OF FILE CometSelector.jsx ---

import React from 'react';

export default function CometSelector({ comets, onSelectComet }) {
  if (!comets || comets.length === 0) {
    return <p>Нет рассчитанных комет.</p>;
  }

  return (
    <div style={{ marginBottom: '1.5rem', width: '100%' }}>
      <label htmlFor="comet-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        Выберите комету для просмотра:
      </label>
      <select
        id="comet-select"
        onChange={(e) => onSelectComet(e.target.value)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--primary)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '1rem'
        }}
      >
        {comets.map(comet => (
          <option key={comet.id} value={comet.id}>
            {comet.name}
          </option>
        ))}
      </select>
    </div>
  );
}
