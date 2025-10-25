import React from 'react';

export default function CometSelector({ comets, onSelectComet }) {
  if (!comets || comets.length === 0) {
    return <p>Нет доступных комет для отображения.</p>;
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label htmlFor="comet-select" style={{ display: 'block', marginBottom: '0.5rem' }}>
        Выберите комету:
      </label>
      <select
        id="comet-select"
        onChange={(e) => onSelectComet(e.target.value)}
        style={{
          width: '100%',
          padding: '0.5rem',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '4px',
          color: 'white'
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
