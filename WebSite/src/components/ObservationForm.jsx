// src/components/ObservationForm.jsx
import React, { useState } from 'react';
import { calculateOrbitFromObservations, findCloseApproach } from '../utils/orbitalCalculations';

export default function ObservationForm({ onOrbitCalculated }) {
  const [observations, setObservations] = useState([]);
  const [currentObs, setCurrentObs] = useState({
    date: '',
    time: '',
    raHours: '',
    raMinutes: '',
    raSeconds: '',
    decDegrees: '',
    decMinutes: '',
    decSeconds: '',
    decSign: '+'
  });

  const handleAddObservation = () => {
    if (!currentObs.date || !currentObs.time) {
      alert('Пожалуйста, заполните дату и время');
      return;
    }

    const raDecimal = (parseFloat(currentObs.raHours) +
                      parseFloat(currentObs.raMinutes)/60 +
                      parseFloat(currentObs.raSeconds)/3600) * 15;

    const decDecimal = (parseFloat(currentObs.decDegrees) +
                       parseFloat(currentObs.decMinutes)/60 +
                       parseFloat(currentObs.decSeconds)/3600);
    const signedDec = currentObs.decSign === '-' ? -decDecimal : decDecimal;

    const newObservation = {
      id: Date.now(),
      datetime: `${currentObs.date}T${currentObs.time}`,
      ra: raDecimal,
      dec: signedDec,
      timestamp: new Date(`${currentObs.date}T${currentObs.time}`).getTime()
    };

    setObservations([...observations, newObservation]);
    setCurrentObs({
      date: '',
      time: '',
      raHours: '',
      raMinutes: '',
      raSeconds: '',
      decDegrees: '',
      decMinutes: '',
      decSeconds: '',
      decSign: '+'
    });
  };

  const calculateOrbit = () => {
    if (observations.length < 3) {
      alert('Нужно минимум 3 наблюдения для расчета орбиты');
      return;
    }

    try {
      const orbitParams = calculateOrbitFromObservations(observations);
      const closeApproach = findCloseApproach(orbitParams);

      onOrbitCalculated(orbitParams, closeApproach, observations);
    } catch (error) {
      alert('Ошибка при расчете орбиты: ' + error.message);
    }
  };

  const removeObservation = (id) => {
    setObservations(observations.filter(obs => obs.id !== id));
  };

  return (
    <div className="observation-form">
      <h3>📡 Ввод наблюдений</h3>

      <div className="form-group">
        <label>Дата наблюдения</label>
        <input
          type="date"
          value={currentObs.date}
          onChange={(e) => setCurrentObs({...currentObs, date: e.target.value})}
        />
      </div>

      <div className="form-group">
        <label>Время наблюдения (UTC)</label>
        <input
          type="time"
          value={currentObs.time}
          onChange={(e) => setCurrentObs({...currentObs, time: e.target.value})}
          step="1"
        />
      </div>

      <div className="form-group">
        <label>Прямое восхождение (RA)</label>
        <div className="coord-inputs">
          <input
            placeholder="Часы"
            value={currentObs.raHours}
            onChange={(e) => setCurrentObs({...currentObs, raHours: e.target.value})}
          />
          <input
            placeholder="Минуты"
            value={currentObs.raMinutes}
            onChange={(e) => setCurrentObs({...currentObs, raMinutes: e.target.value})}
          />
          <input
            placeholder="Секунды"
            value={currentObs.raSeconds}
            onChange={(e) => setCurrentObs({...currentObs, raSeconds: e.target.value})}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Склонение (Dec)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={currentObs.decSign}
            onChange={(e) => setCurrentObs({...currentObs, decSign: e.target.value})}
            style={{
              padding: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'white'
            }}
          >
            <option value="+">+</option>
            <option value="-">-</option>
          </select>
          <input
            placeholder="Градусы"
            value={currentObs.decDegrees}
            onChange={(e) => setCurrentObs({...currentObs, decDegrees: e.target.value})}
          />
          <input
            placeholder="Минуты"
            value={currentObs.decMinutes}
            onChange={(e) => setCurrentObs({...currentObs, decMinutes: e.target.value})}
          />
          <input
            placeholder="Секунды"
            value={currentObs.decSeconds}
            onChange={(e) => setCurrentObs({...currentObs, decSeconds: e.target.value})}
          />
        </div>
      </div>

      <button className="btn" onClick={handleAddObservation}>
        ➕ Добавить наблюдение
      </button>

      {observations.length > 0 && (
        <div className="observations-list">
          <h4>Добавленные наблюдения: {observations.length}</h4>
          {observations.map(obs => (
            <div key={obs.id} className="observation-item">
              <div>Время: {new Date(obs.timestamp).toLocaleString()}</div>
              <div>RA: {obs.ra.toFixed(4)}°</div>
              <div>Dec: {obs.dec.toFixed(4)}°</div>
              <button
                onClick={() => removeObservation(obs.id)}
                style={{
                  background: 'rgba(255,107,107,0.2)',
                  color: '#ff6b6b',
                  border: '1px solid rgba(255,107,107,0.5)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  marginTop: '0.5rem',
                  fontSize: '0.8rem'
                }}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      {observations.length >= 3 && (
        <button className="btn" onClick={calculateOrbit} style={{ marginTop: '1rem' }}>
          🚀 Рассчитать орбиту
        </button>
      )}
    </div>
  );
}
