// src/App.jsx

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import CometOrbitScene from './components/CometOrbitScene';
import ObservationForm from './components/ObservationForm';
import CometSelector from './components/CometSelector';
import ResultsDisplay from './components/ResultsDisplay';
import '../style.css';

function App() {
  const [orbitParams, setOrbitParams] = useState(null);
  const [observations, setObservations] = useState([]);
  const [closeApproach, setCloseApproach] = useState(null);
  const [selectedComet, setSelectedComet] = useState(null);

  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({ once: true });
    }
    if (window.feather) {
      window.feather.replace();
    }
  }, []);

  const handleOrbitCalculated = (params, obs, approach) => {
    setOrbitParams(params);
    setObservations(obs);
    setCloseApproach(approach);
    setSelectedComet(null); // Сбрасываем выбор, чтобы показать новую рассчитанную орбиту
  };

  const handleCometSelect = (comet) => {
    setSelectedComet(comet);
    setOrbitParams(null);
    setObservations([]);
    setCloseApproach(null);
    document.getElementById('visualization-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ❗️ ИЗМЕНЕННАЯ ЛОГИКА: теперь возвращает null по умолчанию
  const activeOrbitData = useMemo(() => {
    // 1. Приоритет у выбранной кометы с бэкенда
    if (selectedComet && selectedComet.elements) {
      return {
        source: 'backend',
        name: selectedComet.name,
        params: selectedComet.elements,
        observations: selectedComet.observations,
        approach: selectedComet.close_approach,
      };
    }
    // 2. Если есть свежерассчитанная орбита на клиенте
    if (orbitParams) {
      return {
        source: 'calculated',
        name: 'Новая рассчитанная комета',
        params: {
          semimajor_axis: orbitParams.semiMajorAxis,
          eccentricity: orbitParams.eccentricity,
          inclination: orbitParams.inclination,
          ra_of_node: orbitParams.longitudeOfAscNode,
          arg_of_pericenter: orbitParams.argOfPeriapsis,
          period: orbitParams.period,
        },
        observations: observations,
        approach: closeApproach,
      };
    }
    // 3. ❗️ Если данных нет — возвращаем null. Сцена будет пустой.
    return null;
  }, [selectedComet, orbitParams, observations, closeApproach]);

  const scrollToObservations = () => {
    document.getElementById('observations-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToVisualization = () => {
    document.getElementById('visualization-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header data-aos="fade-down" data-aos-delay="200">{/* ... */}</header>
      <a href="#" className="to-top"><i data-feather="chevron-up"></i></a>
      <section className="hero">{/* ... */}</section>
      <section className="status">{/* ... */}</section>

      <section id="observations-section" className="why-us">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="400">
              <h2>СИСТЕМА ОПРЕДЕЛЕНИЯ ОРБИТ</h2>
              <h1>Введите данные наблюдений</h1>
              <p>Добавьте минимум 3 астрометрических наблюдения для расчета орбиты.</p>
            </div>
            <div className="reason">
              <div className="card" data-aos="fade-up" data-aos-delay="400" style={{ width: '100%', height: 'auto' }}>
                <ObservationForm onOrbitCalculated={handleOrbitCalculated} existingObservations={observations} />
              </div>
              {orbitParams && (
                <div className="card" data-aos="fade-up" data-aos-delay="200" style={{ width: '100%', height: 'auto', marginTop: '2rem' }}>
                  <ResultsDisplay orbitParams={orbitParams} closeApproach={closeApproach} observations={observations} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="selector-section" className="comet-database">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="400">
              <h2>БАЗА ДАННЫХ</h2>
              <h1>Исследуйте известные кометы</h1>
              <p>Выберите комету из списка, чтобы загрузить ее орбиту и визуализировать траекторию.</p>
            </div>
            <div className="card" data-aos="fade-up" data-aos-delay="500" style={{ width: '100%' }}>
              <CometSelector onCometSelect={handleCometSelect} selectedCometId={selectedComet ? selectedComet.id : null} />
            </div>
          </div>
        </div>
      </section>

      <section id="visualization-section" className="visualization-3d">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="200">
              <h2>3D ВИЗУАЛИЗАЦИЯ ОРБИТЫ</h2>
              {/* ❗️ Заголовок меняется в зависимости от того, есть ли данные */}
              <h1>{activeOrbitData ? activeOrbitData.name : 'Нет данных для отображения'}</h1>
              <p>Интерактивная 3D модель орбиты. Используйте мышь для вращения и масштабирования.</p>
            </div>
            <div className="orbit-visualization" data-aos="fade-up" data-aos-delay="400">
              <div className="visualization-container">
                {/* ❗️ Передаем параметры или null. Сцена сама решит, что рендерить */}
                <CometOrbitScene orbitToDisplay={activeOrbitData ? activeOrbitData.params : null} />
              </div>
              <div className="orbit-info">
                {/* ❗️ Информация отображается только если есть активная орбита */}
                {activeOrbitData ? (
                  <>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Большая полуось (a):</span>
                        <span className="info-value">{activeOrbitData.params.semimajor_axis.toFixed(3)} а.е.</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Эксцентриситет (e):</span>
                        <span className="info-value">{activeOrbitData.params.eccentricity.toFixed(3)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Наклонение (i):</span>
                        <span className="info-value">{activeOrbitData.params.inclination.toFixed(2)}°</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Долгота восх. узла (Ω):</span>
                        <span className="info-value">{activeOrbitData.params.ra_of_node.toFixed(2)}°</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Аргумент перицентра (ω):</span>
                        <span className="info-value">{activeOrbitData.params.arg_of_pericenter.toFixed(2)}°</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Период обращения:</span>
                        <span className="info-value">{activeOrbitData.params.period.toFixed(0)} дней</span>
                      </div>
                    </div>
                    <div className="calculation-info">
                      <p>
                        {activeOrbitData.source === 'calculated'
                          ? `✅ Орбита рассчитана по ${activeOrbitData.observations.length} наблюдениям`
                          : `📄 Данные загружены с сервера для кометы "${activeOrbitData.name}"`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="calculation-info">
                    <p>🌟 Нет выбранной орбиты</p>
                    <p className="timestamp">
                      Рассчитайте новую орбиту, введя данные наблюдений, или выберите комету из базы данных.
                    </p>
                    <button
                      className="btn-primary"
                      onClick={scrollToObservations}
                      style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem' }}
                    >
                      Перейти к вводу данных
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <p>404: logic not found - Orbit Determinator • Система определения орбит небесных тел</p>
      </footer>
    </>
  );
}

export default App;
