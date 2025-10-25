// src/components/CometSelector.jsx
import React, { useState, useEffect } from 'react';

// URL вашего бэкенда. Убедитесь, что он правильный.
const API_URL = 'http://localhost:8000/api/comets/';

export default function CometSelector({ onCometSelect, selectedCometId }) {
  const [comets, setComets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchComets() {
      try {
        setLoading(true);
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Ошибка сети: ${response.status}`);
        }
        const data = await response.json();
        setComets(data);
        setError(null);
      } catch (err) {
        setError(`Не удалось загрузить данные: ${err.message}. Убедитесь, что backend-сервер запущен.`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchComets();
  }, []); // Пустой массив зависимостей означает, что эффект выполнится один раз при монтировании

  if (loading) {
    return <div className="loading-state">Загрузка списка комет...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="comet-selector-section">
      <h3>🌌 Выберите комету из базы данных</h3>
      {comets.length === 0 ? (
        <p>Кометы не найдены. Добавьте их через форму наблюдений.</p>
      ) : (
        <table className="comet-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Кол-во наблюдений</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {comets.map(comet => (
              <tr
                key={comet.id}
                className={selectedCometId === comet.id ? 'selected-row' : ''}
                onClick={() => onCometSelect(comet)}
              >
                <td>{comet.id}</td>
                <td>{comet.name}</td>
                <td>{comet.observations.length}</td>
                <td>
                  <button className="btn-secondary">
                    {selectedCometId === comet.id ? '✓ Выбрана' : 'Показать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
