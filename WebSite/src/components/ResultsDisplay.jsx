// src/components/ResultsDisplay.jsx
import React from 'react';

export default function ResultsDisplay({ orbitParams, closeApproach, observations }) {
  if (!orbitParams) {
    return (
      <div className="calculation-info">
        <p>Данные об орбите не загружены.</p>
      </div>
    );
  }

  // Расчет периода по 3-му закону Кеплера (если его нет в данных)
  const periodInDays = orbitParams.period || (orbitParams.semimajor_axis ? Math.sqrt(Math.pow(orbitParams.semimajor_axis, 3)) * 365.25 : null);

  return (
    <div className="results-section">
      <h3>📊 Результаты расчета</h3>
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Большая полуось (a):</span>
          <span className="info-value">{orbitParams.semimajor_axis?.toFixed(3)} а.е.</span>
        </div>
        <div className="info-item">
          <span className="info-label">Эксцентриситет (e):</span>
          <span className="info-value">{orbitParams.eccentricity?.toFixed(3)}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Наклонение (i):</span>
          <span className="info-value">{orbitParams.inclination?.toFixed(2)}°</span>
        </div>
        <div className="info-item">
          <span className="info-label">Долгота восх. узла (Ω):</span>
          <span className="info-value">{orbitParams.ra_of_node?.toFixed(2)}°</span>
        </div>
        <div className="info-item">
          <span className="info-label">Аргумент перицентра (ω):</span>
          <span className="info-value">{orbitParams.arg_of_pericenter?.toFixed(2)}°</span>
        </div>
        {periodInDays && (
          <div className="info-item">
            <span className="info-label">Период обращения:</span>
            {/* ❗️ ИСПРАВЛЕНИЕ: Добавлена опциональная цепочка для безопасности */}
            <span className="info-value">{periodInDays?.toFixed(0)} дней</span>
          </div>
        )}
      </div>

      {closeApproach && (
        <div className="close-approach" style={{ marginTop: '1rem' }}>
          <h4>🌍 Сближение с Землей</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Дата:</span>
              <span className="info-value">
                {new Date(closeApproach.approach_date).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Дистанция:</span>
              <span className="info-value">
                {closeApproach.min_distance_au?.toFixed(3)} а.е.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="calculation-info" style={{ marginTop: '1rem' }}>
        <p>✅ Расчет основан на {observations?.length || 0} наблюдениях</p>
        {orbitParams.calculation_date && (
          <p className="timestamp">
            Последний расчет: {new Date(orbitParams.calculation_date).toLocaleString('ru-RU')}
          </p>
        )}
      </div>
    </div>
  );
}
