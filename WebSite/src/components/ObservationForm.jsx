import React, { useState, useRef } from 'react';
import { calculateOrbitFromObservations } from '../utils/orbitalCalculations';

export default function ObservationForm({ onOrbitCalculated, existingObservations = [] }) {
  const [comets, setComets] = useState([
    {
      id: 1,
      name: 'Комета 1',
      observations: [],
      isExpanded: true
    }
  ]);
  const [selectedCometId, setSelectedCometId] = useState(1);
  const [currentObs, setCurrentObs] = useState({
    date: '',
    time: '',
    ra: '',
    dec: '',
    photo: null,
    photoPreview: null
  });

  const fileInputRef = useRef(null);

  // Получение текущей выбранной кометы
  const getSelectedComet = () => comets.find(comet => comet.id === selectedCometId);

  // Получение наблюдений для выбранной кометы
  const getCurrentObservations = () => {
    const comet = getSelectedComet();
    return comet ? comet.observations : [];
  };

  // Добавление новой кометы
  const addNewComet = () => {
    const newCometId = Math.max(...comets.map(c => c.id), 0) + 1;
    const newComet = {
      id: newCometId,
      name: `Комета ${newCometId}`,
      observations: [],
      isExpanded: true
    };
    setComets([...comets, newComet]);
    setSelectedCometId(newCometId);
  };

  // Удаление кометы
  const removeComet = (cometId) => {
    if (comets.length <= 1) {
      alert('Должна остаться хотя бы одна комета');
      return;
    }

    const updatedComets = comets.filter(comet => comet.id !== cometId);
    setComets(updatedComets);

    if (selectedCometId === cometId) {
      setSelectedCometId(updatedComets[0].id);
    }
  };

  // Обновление имени кометы
  const updateCometName = (cometId, newName) => {
    setComets(comets.map(comet =>
      comet.id === cometId ? { ...comet, name: newName } : comet
    ));
  };

  // Переключение видимости наблюдений кометы
  const toggleCometExpanded = (cometId) => {
    setComets(comets.map(comet =>
      comet.id === cometId ? { ...comet, isExpanded: !comet.isExpanded } : comet
    ));
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentObs({
          ...currentObs,
          photo: file,
          photoPreview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setCurrentObs({
      ...currentObs,
      photo: null,
      photoPreview: null
    });
  };

  // Функция для преобразования строки RA в десятичные градусы
  const parseRA = (raString) => {
    if (!raString) return 0;

    const parts = raString.trim().split(/\s+/);
    if (parts.length !== 3) {
      throw new Error('Прямое восхождение должно быть в формате: HH MM SS');
    }

    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      throw new Error('Некорректный формат прямого восхождения');
    }

    return (hours + minutes/60 + seconds/3600) * 15;
  };

  // Функция для преобразования строки Dec в десятичные градусы
  const parseDec = (decString) => {
    if (!decString) return 0;

    const parts = decString.trim().split(/\s+/);
    if (parts.length !== 3) {
      throw new Error('Склонение должно быть в формате: ±DD MM SS');
    }

    const sign = parts[0].startsWith('-') ? -1 : 1;
    const degrees = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);

    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
      throw new Error('Некорректный формат склонения');
    }

    return sign * (Math.abs(degrees) + minutes/60 + seconds/3600);
  };

  const handleAddObservation = () => {
    if (!currentObs.date || !currentObs.time) {
      alert('Пожалуйста, заполните дату и время');
      return;
    }

    // Валидация координат
    if (!currentObs.ra.trim()) {
      alert('Пожалуйста, введите прямое восхождение');
      return;
    }

    if (!currentObs.dec.trim()) {
      alert('Пожалуйста, введите склонение');
      return;
    }

    try {
      const raDecimal = parseRA(currentObs.ra);
      const decDecimal = parseDec(currentObs.dec);

      const newObservation = {
        id: Date.now(),
        datetime: `${currentObs.date}T${currentObs.time}`,
        ra: raDecimal,
        dec: decDecimal,
        raString: currentObs.ra,
        decString: currentObs.dec,
        timestamp: new Date(`${currentObs.date}T${currentObs.time}`).getTime(),
        photo: currentObs.photoPreview,
        photoName: currentObs.photo ? currentObs.photo.name : null
      };

      // Обновляем наблюдения для выбранной кометы
      const updatedComets = comets.map(comet => {
        if (comet.id === selectedCometId) {
          const updatedObservations = [...comet.observations, newObservation];

          // Автоматически пересчитываем орбиту если есть достаточно наблюдений
          if (updatedObservations.length >= 3) {
            try {
              const orbitParams = calculateOrbitFromObservations(updatedObservations);
              onOrbitCalculated(orbitParams, updatedObservations, comet.id, comet.name);

              // Скролл к 3D визуализации
              setTimeout(() => {
                document.querySelector('.visualization-3d')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }, 500);
            } catch (error) {
              console.error('Ошибка расчета:', error);
            }
          }

          return { ...comet, observations: updatedObservations };
        }
        return comet;
      });

      setComets(updatedComets);

      // Сброс формы
      setCurrentObs({
        date: '', time: '',
        ra: '', dec: '',
        photo: null,
        photoPreview: null
      });

    } catch (error) {
      alert(error.message);
    }
  };

  const removeObservation = (cometId, observationId) => {
    const updatedComets = comets.map(comet => {
      if (comet.id === cometId) {
        const updatedObservations = comet.observations.filter(obs => obs.id !== observationId);

        // Пересчет если осталось достаточно наблюдений
        if (updatedObservations.length >= 3) {
          const orbitParams = calculateOrbitFromObservations(updatedObservations);
          onOrbitCalculated(orbitParams, updatedObservations, comet.id, comet.name);
        } else if (updatedObservations.length < 3) {
          onOrbitCalculated(null, updatedObservations, comet.id, comet.name);
        }

        return { ...comet, observations: updatedObservations };
      }
      return comet;
    });

    setComets(updatedComets);
  };

  const currentObservations = getCurrentObservations();
  const selectedComet = getSelectedComet();

  return (
    <div className="observation-form">
      <h3 style={{ color: '#4ecdc4', marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>
        📡 Система отслеживания комет
      </h3>

      {/* Панель управления кометами */}
      <div className="comets-panel">
        <div className="comets-header">
          <h4>Управление кометами</h4>
          <button className="btn-add-comet" onClick={addNewComet}>
            <i data-feather="plus-circle" className="btn-icon"></i>
            Добавить комету
          </button>
        </div>
        <div className="comets-list">
          {comets.map(comet => (
            <div key={comet.id} className={`comet-item ${selectedCometId === comet.id ? 'active' : ''}`}>
              <div className="comet-header">
                <div className="comet-info">
                  <input
                    type="text"
                    value={comet.name}
                    onChange={(e) => updateCometName(comet.id, e.target.value)}
                    className="comet-name-input"
                    placeholder="Введите имя кометы"
                  />
                  <span className="comet-stats">
                    {comet.observations.length} наблюдений
                  </span>
                </div>
                <div className="comet-actions">
                  <button
                    className="comet-toggle-btn"
                    onClick={() => toggleCometExpanded(comet.id)}
                  >
                    <i data-feather={comet.isExpanded ? "chevron-up" : "chevron-down"}></i>
                  </button>
                  <button
                    className={`comet-select-btn ${selectedCometId === comet.id ? 'active' : ''}`}
                    onClick={() => setSelectedCometId(comet.id)}
                  >
                    <i data-feather="target"></i>
                  </button>
                  {comets.length > 1 && (
                    <button
                      className="comet-remove-btn"
                      onClick={() => removeComet(comet.id)}
                    >
                      <i data-feather="trash-2"></i>
                    </button>
                  )}
                </div>
              </div>

              {comet.isExpanded && (
                <div className="comet-observations">
                  {comet.observations.length === 0 ? (
                    <div className="no-observations">
                      Нет наблюдений для этой кометы
                    </div>
                  ) : (
                    comet.observations.map(obs => (
                      <div key={obs.id} className="observation-mini">
                        <span>{new Date(obs.timestamp).toLocaleDateString('ru-RU')}</span>
                        <span>RA: {obs.raString}</span>
                        <span>Dec: {obs.decString}</span>
                        {obs.photo && <i data-feather="image"></i>}
                        <button
                          className="btn-danger-small"
                          onClick={() => removeObservation(comet.id, obs.id)}
                        >
                          <i data-feather="x"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Форма ввода данных для выбранной кометы */}
      <div className="observation-input-section">
        <div className="current-comet-info">
          <h4>Добавление наблюдения для: <span className="comet-name">{selectedComet?.name}</span></h4>
        </div>

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

        {/* Координаты в одной строке */}
        <div className="form-row">
          <div className="form-group">
            <label>Прямое восхождение (RA) *</label>
            <div className="coord-input-single">
              <input
                type="text"
                placeholder="HH MM SS"
                value={currentObs.ra}
                onChange={(e) => setCurrentObs({...currentObs, ra: e.target.value})}
                className="coord-input"
              />
              <div className="coord-example">Пример: 12 34 56.7</div>
            </div>
          </div>

          <div className="form-group">
            <label>Склонение (Dec) *</label>
            <div className="coord-input-single">
              <input
                type="text"
                placeholder="±DD MM SS"
                value={currentObs.dec}
                onChange={(e) => setCurrentObs({...currentObs, dec: e.target.value})}
                className="coord-input"
              />
              <div className="coord-example">Пример: +45 30 15.2 или -23 45 30</div>
            </div>
          </div>
        </div>

        {/* Секция загрузки фото */}
        <div className="form-group">
          <label>Фотография кометы (опционально)</label>
          <div className="photo-upload-section">
            {!currentObs.photoPreview ? (
              <div
                className="photo-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <div className="photo-upload-content">
                  <i data-feather="upload" className="photo-upload-icon"></i>
                  <div className="photo-upload-text">
                    <div className="photo-upload-title">Нажмите для загрузки фото</div>
                    <div className="photo-upload-subtitle">Перетащите или кликните по области</div>
                  </div>
                  <p className="photo-upload-hint">JPG, PNG до 5MB</p>
                </div>
              </div>
            ) : (
              <div className="photo-preview">
                <div className="photo-preview-image">
                  <img src={currentObs.photoPreview} alt="Предпросмотр" />
                  <button
                    type="button"
                    className="photo-remove-btn"
                    onClick={removePhoto}
                  >
                    <i data-feather="x"></i>
                  </button>
                </div>
                <p className="photo-name">{currentObs.photo?.name}</p>
              </div>
            )}
          </div>
        </div>

        <button className="btn-primary" onClick={handleAddObservation}>
          <i data-feather="plus" className="btn-icon"></i>
          Добавить наблюдение для {selectedComet?.name}
        </button>
      </div>

      {/* Список наблюдений для выбранной кометы */}
      {currentObservations.length > 0 && (
        <div className="observations-list">
          <h4 style={{ color: '#ffd700', marginBottom: '1rem', textAlign: 'center' }}>
            📋 Наблюдения для {selectedComet?.name}: {currentObservations.length}
          </h4>
          <div className="observations-container">
            {currentObservations.map(obs => (
              <div key={obs.id} className="observation-item">
                <div className="observation-header">
                  <div className="observation-time">
                    <strong>Время:</strong> {new Date(obs.timestamp).toLocaleString('ru-RU')}
                  </div>
                  {obs.photo && (
                    <span className="photo-badge">
                      <i data-feather="image"></i> Фото
                    </span>
                  )}
                </div>
                <div className="observation-coords">
                  <div><strong>RA:</strong> {obs.raString || `${obs.ra.toFixed(4)}°`}</div>
                  <div><strong>Dec:</strong> {obs.decString || `${obs.dec.toFixed(4)}°`}</div>
                </div>
                {obs.photo && (
                  <div className="observation-photo">
                    <img src={obs.photo} alt="Фото наблюдения" />
                  </div>
                )}
                <button
                  className="btn-danger"
                  onClick={() => removeObservation(selectedCometId, obs.id)}
                >
                  <i data-feather="trash-2" className="btn-icon"></i>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentObservations.length < 3 && currentObservations.length > 0 && (
        <div className="warning-message">
          <p>
            ⚠️ Нужно минимум 3 наблюдения для расчета орбиты ({3 - currentObservations.length} осталось)
          </p>
        </div>
      )}
    </div>
  );
}
