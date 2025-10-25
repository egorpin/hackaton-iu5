// --- START OF FILE ResultsDisplay.jsx ---

import React from 'react';

// 1 а.е. в километрах
const AU_IN_KM = 149597870.7;

export default function ResultsDisplay({ orbitParams, closeApproach, observations }) {
  // Эта проверка остается, она важна
  if (!orbitParams) {
    return (
      <div className="calculation-info">
        <p>Недостаточно данных для отображения орбиты.</p>
      </div>
    );
  }

  return (
    <div className="results-section">
      <h3>📊 Результаты расчета</h3>

      <div className="param-grid">
        <div className="param-item">
          <div className="param-label">Большая полуось (a)</div>
          {/* --- ИЗМЕНЕНИЕ: Добавляем проверки --- */}
          <div className="param-value">{orbitParams.semimajor_axis?.toFixed(3) ?? 'N/A'} а.е.</div>
        </div>

        <div className="param-item">
          <div className="param-label">Эксцентриситет (e)</div>
          <div className="param-value">{orbitParams.eccentricity?.toFixed(3) ?? 'N/A'}</div>
        </div>

        <div className="param-item">
          <div className="param-label">Наклонение (i)</div>
          <div className="param-value">{orbitParams.inclination?.toFixed(2) ?? 'N/A'}°</div>
        </div>

        <div className="param-item">
          <div className="param-label">Долгота восх. узла (Ω)</div>
          <div className="param-value">{orbitParams.ra_of_node?.toFixed(2) ?? 'N/A'}°</div>
        </div>

        <div className="param-item">
          <div className="param-label">Аргумент перицентра (ω)</div>
          <div className="param-value">{orbitParams.arg_of_pericenter?.toFixed(2) ?? 'N/A'}°</div>
        </div>

        {/* Проверка на наличие `period` уже была, она хорошая */}
        {orbitParams.period && (
            <div className="param-item">
                <div className="param-label">Период обращения</div>
                <div className="param-value">{orbitParams.period.toFixed(0)} дней</div>
            </div>
        )}
      </div>

      {closeApproach && (
        <div className="close-approach">
          <h4>🌍 Сближение с Землей</h4>
          <div className="param-grid">
            <div className="param-item">
              <div className="param-label">Дата сближения</div>
              <div className="param-value">
                {/* ИСПРАВЛЕНИЕ 1: .time -> .approach_date */}
                {new Date(closeApproach.approach_date).toLocaleDateString('ru-RU')}
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">Расстояние (а.е.)</div>
              <div className="param-value">
                {/* ИСПРАВЛЕНИЕ 2: .distance_au -> .min_distance_au */}
                {closeApproach.min_distance_au?.toFixed(3) ?? 'N/A'} а.е.
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">Расстояние (км)</div>
              <div className="param-value">
                {/* ИСПРАВЛЕНИЕ 3: Рассчитываем .distance_km, т.к. его нет в API */}
                {(closeApproach.min_distance_au * AU_IN_KM).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} км
              </div>
            </div>

            {/* ИСПРАВЛЕНИЕ 4: Блок 'relative_velocity' удален, так как его нет в API */}

          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#a0a0c0' }}>
        <strong>Использовано наблюдений:</strong> {observations.length}
        <br />
        <strong>Последнее обновление:</strong> {new Date().toLocaleString('ru-RU')}
      </div>
    </div>
  );
}

// --- END OF FILE ResultsDisplay.jsx ---
