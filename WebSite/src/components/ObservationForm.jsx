import React, { useState, useRef } from 'react';
import { calculateOrbitFromObservations } from '../utils/orbitalCalculations';

export default function ObservationForm({ onOrbitCalculated, existingObservations = [] }) {
  const [observations, setObservations] = useState(existingObservations);
  const [currentObs, setCurrentObs] = useState({
    date: '',
    time: '',
    ra: '', // Прямое восхождение в формате "HH MM SS"
    dec: '', // Склонение в формате "±DD MM SS"
    photo: null,
    photoPreview: null
  });

  const fileInputRef = useRef(null);

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

    return (hours + minutes/60 + seconds/3600) * 15; // Преобразование в градусы
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
        raString: currentObs.ra, // Сохраняем оригинальную строку
        decString: currentObs.dec, // Сохраняем оригинальную строку
        timestamp: new Date(`${currentObs.date}T${currentObs.time}`).getTime(),
        photo: currentObs.photoPreview,
        photoName: currentObs.photo ? currentObs.photo.name : null
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
        ra: '', dec: '',
        photo: null,
        photoPreview: null
      });

    } catch (error) {
      alert(error.message);
    }
  };

  const removeObservation = (id) => {
    const updatedObservations = observations.filter(obs => obs.id !== id);
    setObservations(updatedObservations);

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

      {/* Координаты в одной строке */}
      <div className="form-row">
        <div className="form-group">
          <label>Прямое восхождение (RA) *</label>
          <div className="coord-input-single">
            <input
              type="text"
              placeholder="HH:MM:SS"
              value={currentObs.ra}
              onChange={(e) => setCurrentObs({...currentObs, ra: e.target.value})}
              className="coord-input"
            />
            <div className="coord-example">Пример: 12:34:56.7</div>
          </div>
        </div>

        <div className="form-group">
          <label>Склонение (Dec) *</label>
          <div className="coord-input-single">
            <input
              type="text"
              placeholder="±DD:MM:SS"
              value={currentObs.dec}
              onChange={(e) => setCurrentObs({...currentObs, dec: e.target.value})}
              className="coord-input"
            />
            <div className="coord-example">Пример: +45:30:15.2 или -23:45:30</div>
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
        Добавить наблюдение
      </button>

      {observations.length > 0 && (
        <div className="observations-list">
          <h4 style={{ color: '#ffd700', marginBottom: '1rem', textAlign: 'center' }}>
            📋 Список наблюдений: {observations.length}
          </h4>
          <div className="observations-container">
            {observations.map(obs => (
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
                  onClick={() => removeObservation(obs.id)}
                >
                  <i data-feather="trash-2" className="btn-icon"></i>
                  Удалить
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
