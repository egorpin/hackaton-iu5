import React, { useState } from 'react';
import { calculateOrbitFromObservations } from '../utils/orbitalCalculations';

export default function ObservationForm({ onOrbitCalculated, existingObservations = [] }) {
  const [observations, setObservations] = useState(existingObservations);
  const [currentObs, setCurrentObs] = useState({
    date: '',
    time: '',
    raHours: '', raMinutes: '', raSeconds: '',
    decDegrees: '', decMinutes: '', decSeconds: '', decSign: '+'
  });

  const handleAddObservation = () => {
    if (!currentObs.date || !currentObs.time) {
      alert('Пожалуйста, заполните дату и время');
      return;
    }

    // Валидация координат
    if (!currentObs.raHours && !currentObs.raMinutes && !currentObs.raSeconds) {
      alert('Пожалуйста, введите прямое восхождение');
      return;
    }

    if (!currentObs.decDegrees && !currentObs.decMinutes && !currentObs.decSeconds) {
      alert('Пожалуйста, введите склонение');
      return;
    }

    const raDecimal = (parseFloat(currentObs.raHours || 0) +
                      parseFloat(currentObs.raMinutes || 0)/60 +
                      parseFloat(currentObs.raSeconds || 0)/3600) * 15;

    const decDecimal = (parseFloat(currentObs.decDegrees || 0) +
                       parseFloat(currentObs.decMinutes || 0)/60 +
                       parseFloat(currentObs.decSeconds || 0)/3600);
    const signedDec = currentObs.decSign === '-' ? -decDecimal : decDecimal;

    const newObservation = {
      id: Date.now(),
      datetime: `${currentObs.date}T${currentObs.time}`,
      ra: raDecimal,
      dec: signedDec,
      timestamp: new Date(`${currentObs.date}T${currentObs.time}`).getTime()
    };

    const updatedObservations = [...observations, newObservation];
    setObservations(updatedObservations);

    // Автоматически пересчитываем орбиту если есть достаточно наблюдений
    if (updatedObservations.length >= 3) {
      try {
        const orbitParams = calculateOrbitFromObservations(updatedObservations);
        onOrbitCalculated(orbitParams, updatedObservations);

        // Скролл к 3D визуализации
        setTimeout(() => {
          document.querySelector('.visualization-3d')?.scrollIntoView({
            behavior: 'smooth'
          });
        }, 500);
      } catch (error) {
        console.error('Ошибка расчета:', error);
        alert('Ошибка при расчете орбиты. Проверьте введенные данные.');
      }
    }

    // Сброс формы
    setCurrentObs({
      date: '', time: '',
      raHours: '', raMinutes: '', raSeconds: '',
      decDegrees: '', decMinutes: '', decSeconds: '', decSign: '+'
    });
  };

  const removeObservation = (id) => {
    const updatedObservations = observations.filter(obs => obs.id !== id);
    setObservations(updatedObservations);

    // Пересчет если осталось достаточно наблюдений
    if (updatedObservations.length >= 3) {
      const orbitParams = calculateOrbitFromObservations(updatedObservations);
      onOrbitCalculated(orbitParams, updatedObservations);
    } else if (updatedObservations.length < 3) {
      onOrbitCalculated(null, updatedObservations);
    }
  };

  return (
    <div className="observation-form">
      <h3 style={{ color: '#4ecdc4', marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>
        📡 Ввод астрометрических данных
      </h3>

      <div className="form-row">
        <div className="form-group">
          <label>Дата наблюдения *</label>
          <input
            type="date"
            value={currentObs.date}
            onChange={(e) => setCurrentObs({...currentObs, date: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Время (UTC) *</label>
          <input
            type="time"
            value={currentObs.time}
            onChange={(e) => setCurrentObs({...currentObs, time: e.target.value})}
            step="1"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Прямое восхождение (RA) *</label>
        <div className="coord-inputs">
          <input
            placeholder="Часы"
            value={currentObs.raHours}
            onChange={(e) => setCurrentObs({...currentObs, raHours: e.target.value})}
            type="number"
            min="0"
            max="23"
          />
          <input
            placeholder="Минуты"
            value={currentObs.raMinutes}
            onChange={(e) => setCurrentObs({...currentObs, raMinutes: e.target.value})}
            type="number"
            min="0"
            max="59"
          />
          <input
            placeholder="Секунды"
            value={currentObs.raSeconds}
            onChange={(e) => setCurrentObs({...currentObs, raSeconds: e.target.value})}
            type="number"
            min="0"
            max="59"
            step="0.1"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Склонение (Dec) *</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={currentObs.decSign}
            onChange={(e) => setCurrentObs({...currentObs, decSign: e.target.value})}
          >
            <option value="+">+</option>
            <option value="-">-</option>
          </select>
          <input
            placeholder="Градусы"
            value={currentObs.decDegrees}
            onChange={(e) => setCurrentObs({...currentObs, decDegrees: e.target.value})}
            type="number"
            min="0"
            max="90"
          />
          <input
            placeholder="Минуты"
            value={currentObs.decMinutes}
            onChange={(e) => setCurrentObs({...currentObs, decMinutes: e.target.value})}
            type="number"
            min="0"
            max="59"
          />
          <input
            placeholder="Секунды"
            value={currentObs.decSeconds}
            onChange={(e) => setCurrentObs({...currentObs, decSeconds: e.target.value})}
            type="number"
            min="0"
            max="59"
            step="0.1"
          />
        </div>
      </div>

      <button className="btn-primary" onClick={handleAddObservation}>
        ➕ Добавить наблюдение
      </button>

      {observations.length > 0 && (
        <div className="observations-list">
          <h4 style={{ color: '#ffd700', marginBottom: '1rem', textAlign: 'center' }}>
            📋 Список наблюдений: {observations.length}
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {observations.map(obs => (
              <div key={obs.id} className="observation-item">
                <div>
                  <strong>Время:</strong> {new Date(obs.timestamp).toLocaleString('ru-RU')}
                </div>
                <div>
                  <strong>RA:</strong> {obs.ra.toFixed(4)}° | <strong>Dec:</strong> {obs.dec.toFixed(4)}°
                </div>
                <button
                  className="btn-danger"
                  onClick={() => removeObservation(obs.id)}
                >
                  🗑️ Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {observations.length < 3 && observations.length > 0 && (
        <div className="warning-message">
          <p>
            ⚠️ Нужно минимум 3 наблюдения для расчета орбиты ({3 - observations.length} осталось)
          </p>
        </div>
      )}
    </div>
  );
}
