// --- START OF FILE ResultsDisplay.jsx ---

import React from 'react';

// 1 а.е. в километрах
const AU_IN_KM = 149597870.7;

export default function ResultsDisplay({ orbitParams, closeApproach, observations }) {
  if (!orbitParams) {
    return (
      <div className="calculation-info">
        <p>Недостаточно данных для отображения орбиты.</p>
      </div>
    );
  }

  return (
    <div className="results-section">
      <div className="results-header">
        <h3>📊 Результаты расчета</h3>
        <div className="results-badge">{observations.length} наблюд.</div>
      </div>

      <div className="param-grid">
        <div className="param-item">
          <div className="param-label">Большая полуось (a)</div>
          <div className="param-value">
            {orbitParams.semimajor_axis?.toFixed(3) ?? 'N/A'} 
            <span className="param-unit">а.е.</span>
          </div>
        </div>

        <div className="param-item">
          <div className="param-label">Эксцентриситет (e)</div>
          <div className="param-value">
            {orbitParams.eccentricity?.toFixed(3) ?? 'N/A'}
          </div>
        </div>

        <div className="param-item">
          <div className="param-label">Наклонение (i)</div>
          <div className="param-value">
            {orbitParams.inclination?.toFixed(2) ?? 'N/A'}°
          </div>
        </div>

        <div className="param-item">
          <div className="param-label">Долгота узла (Ω)</div>
          <div className="param-value">
            {orbitParams.ra_of_node?.toFixed(2) ?? 'N/A'}°
          </div>
        </div>

        <div className="param-item">
          <div className="param-label">Аргумент перицентра (ω)</div>
          <div className="param-value">
            {orbitParams.arg_of_pericenter?.toFixed(2) ?? 'N/A'}°
          </div>
        </div>

        {orbitParams.period && (
          <div className="param-item">
            <div className="param-label">Период</div>
            <div className="param-value">
              {orbitParams.period.toFixed(0)} дн.
            </div>
          </div>
        )}
      </div>

      {closeApproach && (
        <div className="close-approach-section">
          <div className="section-header">
            <h4>🌍 Сближение с Землей</h4>
          </div>
          <div className="param-grid">
            <div className="param-item danger-item">
              <div className="param-label">Дата</div>
              <div className="param-value">
                {new Date(closeApproach.approach_date).toLocaleDateString('ru-RU')}
              </div>
            </div>

            <div className="param-item danger-item">
              <div className="param-label">Расстояние</div>
              <div className="param-value">
                {closeApproach.min_distance_au?.toFixed(3) ?? 'N/A'} а.е.
              </div>
            </div>

            <div className="param-item danger-item">
              <div className="param-label">В километрах</div>
              <div className="param-value">
                {(closeApproach.min_distance_au * AU_IN_KM).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} км
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="calculation-footer">
        <div className="timestamp">
          Обновлено: {new Date().toLocaleString('ru-RU')}
        </div>
      </div>
    </div>
  );
}

// --- END OF FILE ResultsDisplay.jsx ---