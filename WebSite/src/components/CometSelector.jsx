// --- START OF FILE CometSelector.jsx ---

import React from 'react';

// Стилизуем таблицу прямо здесь для простоты
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '20px',
  color: '#e0e0e0',
};

const thStyle = {
  padding: '12px 15px',
  textAlign: 'left',
  backgroundColor: 'rgba(78, 205, 196, 0.2)',
  borderBottom: '2px solid #4ECDC4',
  textTransform: 'uppercase',
  fontSize: '0.9rem',
  letterSpacing: '1px',
};

const tdStyle = {
  padding: '12px 15px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
};

const trHoverStyle = {
  cursor: 'pointer',
};


export default function CometSelector({ comets, onCometSelected, isLoading, error }) {
  if (isLoading) {
    return <p style={{ textAlign: 'center', color: '#4ECDC4' }}>Загрузка списка комет...</p>;
  }

  if (error) {
    return <p style={{ textAlign: 'center', color: 'red' }}>Ошибка: {error}</p>;
  }

  if (comets.length === 0) {
    return <p style={{ textAlign: 'center' }}>Нет доступных комет. Попробуйте добавить новую.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Имя кометы</th>
            <th style={thStyle}>Кол-во наблюдений</th>
            <th style={thStyle}>Дата расчета</th>
          </tr>
        </thead>
        <tbody>
          {comets.map(comet => (
            <tr
              key={comet.id}
              onClick={() => onCometSelected(comet)}
              style={trHoverStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <td style={tdStyle}>{comet.id}</td>
              <td style={tdStyle}>{comet.name}</td>
              <td style={tdStyle}>{comet.observations.length}</td>
              <td style={tdStyle}>{new Date(comet.created_at).toLocaleDateString('ru-RU')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- END OF FILE CometSelector.jsx ---```
