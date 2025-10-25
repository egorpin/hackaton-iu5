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
      } catch (error) {
        console.error('Ошибка расчета:', error);
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
    <div style={{ padding: '1rem', width: '100%' }}>
      <h3 style={{ color: '#4ecdc4', marginBottom: '1rem', textAlign: 'center' }}>
        📡 Ввод астрометрических данных
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4ecdc4' }}>
            Дата наблюдения
          </label>
          <input
            type="date"
            value={currentObs.date}
            onChange={(e) => setCurrentObs({...currentObs, date: e.target.value})}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4ecdc4' }}>
            Время (UTC)
          </label>
          <input
            type="time"
            value={currentObs.time}
            onChange={(e) => setCurrentObs({...currentObs, time: e.target.value})}
            step="1"
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4ecdc4' }}>
          Прямое восхождение (RA)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          <input
            placeholder="Часы"
            value={currentObs.raHours}
            onChange={(e) => setCurrentObs({...currentObs, raHours: e.target.value})}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          <input
            placeholder="Минуты"
            value={currentObs.raMinutes}
            onChange={(e) => setCurrentObs({...currentObs, raMinutes: e.target.value})}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          <input
            placeholder="Секунды"
            value={currentObs.raSeconds}
            onChange={(e) => setCurrentObs({...currentObs, raSeconds: e.target.value})}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4ecdc4' }}>
          Склонение (Dec)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={currentObs.decSign}
            onChange={(e) => setCurrentObs({...currentObs, decSign: e.target.value})}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
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
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          <input
            placeholder="Минуты"
            value={currentObs.decMinutes}
            onChange={(e) => setCurrentObs({...currentObs, decMinutes: e.target.value})}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          <input
            placeholder="Секунды"
            value={currentObs.decSeconds}
            onChange={(e) => setCurrentObs({...currentObs, decSeconds: e.target.value})}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'white'
            }}
          />
        </div>
      </div>

      <button
        onClick={handleAddObservation}
        style={{
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        ➕ Добавить наблюдение
      </button>

      {observations.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ color: '#ffd700', marginBottom: '1rem', textAlign: 'center' }}>
            Наблюдения: {observations.length}
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {observations.map(obs => (
              <div key={obs.id} style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                borderLeft: '4px solid #ffd700'
              }}>
                <div style={{ fontSize: '0.9rem' }}>
                  <div>Время: {new Date(obs.timestamp).toLocaleString()}</div>
                  <div>RA: {obs.ra.toFixed(4)}° | Dec: {obs.dec.toFixed(4)}°</div>
                </div>
                <button
                  onClick={() => removeObservation(obs.id)}
                  style={{
                    background: 'rgba(255,107,107,0.2)',
                    color: '#ff6b6b',
                    border: '1px solid rgba(255,107,107,0.5)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {observations.length < 3 && observations.length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255,193,7,0.1)',
          border: '1px solid rgba(255,193,7,0.3)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#ffc107', margin: 0 }}>
            Нужно минимум 3 наблюдения для расчета орбиты ({3 - observations.length} осталось)
          </p>
        </div>
      )}
    </div>
  );
}
