// --- START OF FILE ObservationForm.jsx ---

import React, { useState, useEffect, useRef } from 'react';
import { addObservationToComet, createComet, deleteComet, updateComet } from '../api';

// Компонент для управления одной кометой в списке
function CometItem({ comet, isSelected, onSelect, onUpdateName, onRemove, onToggleExpand }) {
  const [name, setName] = useState(comet.name);

  // Обновляем локальное имя, если пропсы изменились
  useEffect(() => {
    setName(comet.name);
  }, [comet.name]);

  const handleNameChange = (e) => setName(e.target.value);

  const handleNameBlur = () => {
    if (name.trim() && name !== comet.name) {
      onUpdateName(comet.id, { name });
    } else {
      setName(comet.name); // Сброс, если имя пустое или не изменилось
    }
  };

  return (
    <div className={`comet-item ${isSelected ? 'active' : ''}`}>
      <div className="comet-header">
        <div className="comet-info">
          <input type="text" value={name} onChange={handleNameChange} onBlur={handleNameBlur} className="comet-name-input" placeholder="Введите имя кометы" />
          <span className="comet-stats">{comet.observations.length} наблюдений</span>
        </div>
        <div className="comet-actions">
          <button className="comet-toggle-btn" onClick={() => onToggleExpand(comet.id)}><i data-feather={comet.isExpanded ? "chevron-up" : "chevron-down"}></i></button>
          <button className={`comet-select-btn ${isSelected ? 'active' : ''}`} onClick={() => onSelect(comet.id)}><i data-feather="target"></i></button>
          {/* Разрешаем удаление даже если комета одна */}
          <button className="comet-remove-btn" onClick={() => onRemove(comet.id)}><i data-feather="trash-2"></i></button>
        </div>
      </div>
      {comet.isExpanded && (
        <div className="comet-observations">
          {comet.observations.length === 0 ? (
            <div className="no-observations">Нет наблюдений для этой кометы</div>
          ) : (
            comet.observations.map(obs => (
              <div key={obs.id} className="observation-mini">
                <span>{new Date(obs.observation_time).toLocaleDateString('ru-RU')}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Основной компонент-менеджер
export default function ObservationForm({ comets, onUpdate, selectedCometId, setSelectedCometId }) {
  const [currentObs, setCurrentObs] = useState({ 
    date: '', 
    time: '', 
    ra: '', 
    dec: '',
    photo: null,
    photoPreview: null
  });
  const [newCometName, setNewCometName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedComets, setExpandedComets] = useState({});
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (window.feather) window.feather.replace();
  }, [comets, expandedComets, currentObs.photoPreview]);

  const selectedComet = comets.find(c => c.id === selectedCometId);

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите файл изображения');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Размер файла не должен превышать 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentObs({
          ...currentObs,
          photo: file,
          photoPreview: e.target.result
        });
        setError('');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddNewComet = async (e) => {
    e.preventDefault();
    if (!newCometName.trim()) {
      setError("Пожалуйста, введите имя для новой кометы.");
      return;
    }
    setError('');
    try {
      const newComet = await createComet({ name: newCometName });
      onUpdate('add', newComet);
      setSelectedCometId(newComet.id);
      setNewCometName(''); // Очищаем поле ввода
    } catch (err) {
      setError("Не удалось создать комету.");
    }
  };

  const handleRemoveComet = async (cometId) => {
    if (window.confirm(`Вы уверены, что хотите удалить комету "${comets.find(c => c.id === cometId)?.name}"?`)) {
      try {
        await deleteComet(cometId);
        onUpdate('delete', cometId);
      } catch (err) {
        setError("Не удалось удалить комету.");
      }
    }
  };

  const handleUpdateCometName = async (cometId, data) => {
    try {
      const updatedComet = await updateComet(cometId, data);
      onUpdate('update', updatedComet);
    } catch (err) {
      setError("Не удалось обновить имя кометы.");
    }
  };

  const handleAddObservation = async (e) => {
    e.preventDefault();
    if (!selectedCometId || !currentObs.date || !currentObs.time || !currentObs.ra || !currentObs.dec) {
      setError("Все поля для наблюдения (дата, время, RA, Dec) должны быть заполнены.");
      return;
    }

    const ra_hms_str = currentObs.ra.trim().replace(/\s+/g, ':');
    const dec_dms_str = currentObs.dec.trim().replace(/\s+/g, ':');

    const observationData = { 
      observation_time: `${currentObs.date}T${currentObs.time}`, 
      ra_hms_str, 
      dec_dms_str 
    };

    setIsLoading(true);
    setError('');
    try {
      const updatedComet = await addObservationToComet(selectedCometId, observationData);
      onUpdate('update', updatedComet);
      // Сбрасываем форму, включая фото
      setCurrentObs({ 
        date: '', 
        time: '', 
        ra: '', 
        dec: '',
        photo: null,
        photoPreview: null
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessages = Object.entries(err).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' ');
      setError(errorMessages || "Ошибка при добавлении наблюдения.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCometExpanded = (cometId) => {
    setExpandedComets(prev => ({ ...prev, [cometId]: !prev[cometId] }));
  };

  return (
    <div className="observation-form">
      <h3 style={{ color: '#4ecdc4', marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>📡 Система отслеживания комет</h3>

      {/* --- БЛОК ДОБАВЛЕНИЯ НОВОЙ КОМЕТЫ --- */}
      <div className="comets-panel" style={{marginBottom: '2rem'}}>
        <form className="comets-header" onSubmit={handleAddNewComet}>
            <input
              type="text"
              className="comet-name-input"
              placeholder="Введите имя новой кометы"
              value={newCometName}
              onChange={(e) => setNewCometName(e.target.value)}
              style={{flexGrow: 1}}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-outline btn-small">
                <i data-feather="plus-circle" className="btn-icon"></i>
                Добавить комету
              </button>
            </div>
        </form>
      </div>

      <div className="comets-panel">
        <div className="comets-list">
          {comets.map(comet => (
            <CometItem key={comet.id} comet={{...comet, isExpanded: !!expandedComets[comet.id]}} isSelected={selectedCometId === comet.id} onSelect={setSelectedCometId} onUpdateName={handleUpdateCometName} onRemove={handleRemoveComet} onToggleExpand={toggleCometExpanded} />
          ))}
        </div>
      </div>

      <form className="observation-input-section" onSubmit={handleAddObservation}>
        <div className="current-comet-info"><h4>Добавление наблюдения для: <span className="comet-name">{selectedComet?.name || '...'}</span></h4></div>
        <div className="form-row">
          <div className="form-group"><label>Дата наблюдения *</label><input type="date" value={currentObs.date} onChange={(e) => setCurrentObs({...currentObs, date: e.target.value})} required/></div>
          <div className="form-group"><label>Время (UTC) *</label><input type="time" step="1" value={currentObs.time} onChange={(e) => setCurrentObs({...currentObs, time: e.target.value})} required/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Прямое восхождение (RA) *</label><input type="text" placeholder="ЧЧ ММ СС.С" value={currentObs.ra} onChange={(e) => setCurrentObs({...currentObs, ra: e.target.value})} required/><div className="coord-example">Пример: 12 34 56.7</div></div>
          <div className="form-group"><label>Склонение (Dec) *</label><input type="text" placeholder="[+/-]ДД ММ СС.С" value={currentObs.dec} onChange={(e) => setCurrentObs({...currentObs, dec: e.target.value})} required/><div className="coord-example">Пример: +45 30 15.2</div></div>
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
                    <div className="photo-upload-subtitle">Кликните по области</div>
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

        {error && <div className="error-message" style={{color: 'red', textAlign: 'center', margin: '1rem 0'}}>{error}</div>}
        <button type="submit" className="btn btn-outline" disabled={isLoading || !selectedCometId}>
          {isLoading ? "Добавление..." : `Добавить наблюдение для ${selectedComet?.name || ''}`}
        </button>
      </form>
    </div>
  );
}
// --- END OF FILE ObservationForm.jsx ---