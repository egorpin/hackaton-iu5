// src/components/ResultsDisplay.jsx
import React from 'react';

export default function ResultsDisplay({ orbitParams, closeApproach, observations }) {
  if (!orbitParams) return null;

  return (
    <div className="results-section">
      <h3>📊 Результаты расчета</h3>

      <div className="param-grid">
        <div className="param-item">
          <div className="param-label">Большая полуось (a)</div>
          <div className="param-value">{orbitParams.semiMajorAxis.toFixed(3)} а.е.</div>
        </div>

        <div className="param-item">
          <div className="param-label">Эксцентриситет (e)</div>
          <div className="param-value">{orbitParams.eccentricity.toFixed(3)}</div>
        </div>

        <div className="param-item">
          <div className="param-label">Наклонение (i)</div>
          <div className="param-value">{orbitParams.inclination.toFixed(2)}°</div>
        </div>

        <div className="param-item">
          <div className="param-label">Долгота восх. узла (Ω)</div>
          <div className="param-value">{orbitParams.longitudeOfAscNode.toFixed(2)}°</div>
        </div>

        <div className="param-item">
          <div className="param-label">Аргумент перицентра (ω)</div>
          <div className="param-value">{orbitParams.argOfPeriapsis.toFixed(2)}°</div>
        </div>

        <div className="param-item">
          <div className="param-label">Период обращения</div>
          <div className="param-value">{orbitParams.period.toFixed(0)} дней</div>
        </div>
      </div>

      {closeApproach && (
        <div className="close-approach">
          <h4>🌍 Сближение с Землей</h4>
          <div className="param-grid">
            <div className="param-item">
              <div className="param-label">Дата сближения</div>
              <div className="param-value">
                {new Date(closeApproach.time).toLocaleDateString('ru-RU')}
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">Расстояние</div>
              <div className="param-value">
                {closeApproach.distance_au.toFixed(3)} а.е.
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">Расстояние</div>
              <div className="param-value">
                {closeApproach.distance_km.toLocaleString('ru-RU')} км
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">Скорость относительная</div>
              <div className="param-value">
                {closeApproach.relative_velocity.toFixed(1)} км/с
              </div>
            </div>
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
