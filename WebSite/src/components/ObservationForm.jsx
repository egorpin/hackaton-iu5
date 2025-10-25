import React, { useState } from 'react';

export default function ObservationForm({ onNewCometCalculated }) {
  const [observations, setObservations] = useState([]);
  const [cometName, setCometName] = useState('');
  const [currentObs, setCurrentObs] = useState({
    date: '', time: '',
    raHours: '', raMinutes: '', raSeconds: '',
    decDegrees: '', decMinutes: '', decSeconds: '', decSign: '+',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Добавление наблюдения в локальный список
  const handleAddObservation = () => {
    if (!currentObs.date || !currentObs.time || !currentObs.raHours || !currentObs.decDegrees) {
      alert('Пожалуйста, заполните все обязательные поля: дата, время и хотя бы часы (RA) и градусы (Dec).');
      return;
    }

    const newObservation = {
      id: Date.now(),
      datetime: `${currentObs.date}T${currentObs.time}:00Z`,
      timestamp: new Date(`${currentObs.date}T${currentObs.time}`).getTime(),
      raHours: currentObs.raHours || '0', raMinutes: currentObs.raMinutes || '0', raSeconds: currentObs.raSeconds || '0',
      decDegrees: currentObs.decDegrees || '0', decMinutes: currentObs.decMinutes || '0', decSeconds: currentObs.decSeconds || '0',
      decSign: currentObs.decSign,
    };
    setObservations(prev => [...prev, newObservation]);

    // Сброс полей ввода
    setCurrentObs({
      date: '', time: '', raHours: '', raMinutes: '', raSeconds: '',
      decDegrees: '', decMinutes: '', decSeconds: '', decSign: '+'
    });
  };

  const removeObservation = (id) => {
    setObservations(observations.filter(obs => obs.id !== id));
  };

  // Отправка данных на бэкенд для расчета
  const handleCalculateOrbit = async () => {
    if (observations.length < 5) {
      alert('Нужно минимум 5 наблюдений для расчета на сервере.');
      return;
    }
    if (!cometName.trim()) {
      alert('Пожалуйста, введите имя для новой кометы.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: cometName,
      observations: observations.map(obs => ({
        observation_time: obs.datetime,
        raHours: parseInt(obs.raHours), raMinutes: parseInt(obs.raMinutes), raSeconds: parseFloat(obs.raSeconds),
        decDegrees: parseInt(obs.decDegrees), decMinutes: parseInt(obs.decMinutes), decSeconds: parseFloat(obs.decSeconds),
        decSign: obs.decSign
      }))
    };

    try {
      // ❗️ ВАЖНО: ЗАМЕНИТЬ НА ПОЛНЫЙ URL ТВОЕГО БЭКЕНДА, ЕСЛИ ОН НА ДРУГОМ ПОРТУ
      // Например: 'http://127.0.0.1:8000/api/comets/calculate/'
      const response = await fetch('/api/comets/calculate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Неизвестная ошибка сервера');
      }

      onNewCometCalculated(result);
      alert(`Орбита для кометы "${result.name}" успешно рассчитана!`);

      setObservations([]);
      setCometName('');

    } catch (error) {
      console.error('Ошибка при отправке на сервер:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="observation-form">
      <h3 style={{ color: '#4ecdc4', marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>
        📡 Ввод астрометрических данных
      </h3>

      <div className="form-group">
        <label>Имя новой кометы *</label>
        <input
          type="text"
          value={cometName}
          onChange={(e) => setCometName(e.target.value)}
          placeholder="Например, Комета-Открытие"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group"><label>Дата наблюдения *</label><input type="date" value={currentObs.date} onChange={(e) => setCurrentObs({...currentObs, date: e.target.value})} required/></div>
        <div className="form-group"><label>Время (UTC) *</label><input type="time" value={currentObs.time} onChange={(e) => setCurrentObs({...currentObs, time: e.target.value})} step="1" required/></div>
      </div>

      <div className="form-group">
        <label>Прямое восхождение (RA) *</label>
        <div className="coord-inputs">
          <input placeholder="Часы" value={currentObs.raHours} onChange={(e) => setCurrentObs({...currentObs, raHours: e.target.value})} type="number" min="0" max="23"/>
          <input placeholder="Минуты" value={currentObs.raMinutes} onChange={(e) => setCurrentObs({...currentObs, raMinutes: e.target.value})} type="number" min="0" max="59"/>
          <input placeholder="Секунды" value={currentObs.raSeconds} onChange={(e) => setCurrentObs({...currentObs, raSeconds: e.target.value})} type="number" min="0" max="59" step="0.1"/>
        </div>
      </div>

      <div className="form-group">
        <label>Склонение (Dec) *</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={currentObs.decSign} onChange={(e) => setCurrentObs({...currentObs, decSign: e.target.value})}>
            <option value="+">+</option><option value="-">-</option>
          </select>
          <input placeholder="Градусы" value={currentObs.decDegrees} onChange={(e) => setCurrentObs({...currentObs, decDegrees: e.target.value})} type="number" min="0" max="90"/>
          <input placeholder="Минуты" value={currentObs.decMinutes} onChange={(e) => setCurrentObs({...currentObs, decMinutes: e.target.value})} type="number" min="0" max="59"/>
          <input placeholder="Секунды" value={currentObs.decSeconds} onChange={(e) => setCurrentObs({...currentObs, decSeconds: e.target.value})} type="number" min="0" max="59" step="0.1"/>
        </div>
      </div>

      <button className="btn-primary" onClick={handleAddObservation}>
        <i data-feather="plus" className="btn-icon"></i> Добавить наблюдение в список
      </button>

      {observations.length > 0 && (
        <div className="observations-list">
          <h4>📋 Список для отправки: {observations.length}</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {observations.map(obs => (
              <div key={obs.id} className="observation-item">
                <div><strong>Время:</strong> {new Date(obs.timestamp).toLocaleString('ru-RU')}</div>
                <button className="btn-danger" onClick={() => removeObservation(obs.id)}>
                  <i data-feather="trash-2" className="btn-icon"></i> Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {observations.length > 0 && (
        <div className={observations.length < 5 ? "warning-message" : "success-message"}>
          <p>
            {observations.length < 5
             ? `⚠️ Нужно минимум 5 наблюдений для расчета (${5 - observations.length} осталось)`
             : `✅ Готово к отправке на сервер!`}
          </p>
        </div>
      )}

      {observations.length >= 5 && (
        <div style={{marginTop: '2rem', textAlign: 'center'}}>
          <button className="btn-success" onClick={handleCalculateOrbit} disabled={isSubmitting}>
            {isSubmitting ? 'Рассчитываем...' : `Рассчитать орбиту на сервере`}
          </button>
        </div>
      )}
    </div>
  );
}
