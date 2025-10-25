// src/App.jsx

import React, { useState, useEffect } from 'react';
import CometOrbitScene from './components/CometOrbitScene';
import ObservationForm from './components/ObservationForm'; // <-- ИЗМЕНЕНО НАЗАД
import ResultsDisplay from './components/ResultsDisplay';
import { getComets } from './api';
import '../style.css';

function App() {
  const [comets, setComets] = useState([]);
  const [selectedCometId, setSelectedCometId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const defaultOrbitParams = {
    semimajor_axis: 10.5, eccentricity: 0.85, inclination: 45,
    ra_of_node: 75, arg_of_pericenter: 120, period: 3500,
  };

  useEffect(() => {
    if (window.AOS) window.AOS.init();

    const fetchComets = async () => {
      try {
        setIsLoading(true);
        const cometsData = await getComets();
        setComets(cometsData);
        if (cometsData.length > 0) {
          setSelectedCometId(cometsData[0].id);
        }
        setError(null);
      } catch (err) {
        setError("Не удалось загрузить список комет. Проверьте, запущен ли бэкенд-сервер.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchComets();
  }, []);

  useEffect(() => {
      if(window.feather) window.feather.replace();
  });

  const handleCometsUpdate = (action, data) => {
    switch (action) {
      case 'add':
        setComets([data, ...comets]);
        break;
      case 'delete':
        const newComets = comets.filter(c => c.id !== data);
        setComets(newComets);
        if (selectedCometId === data && newComets.length > 0) {
          setSelectedCometId(newComets[0].id);
        } else if (newComets.length === 0) {
            setSelectedCometId(null);
        }
        break;
      case 'update':
        setComets(comets.map(c => (c.id === data.id ? data : c)));
        break;
      default:
        break;
    }
    scrollToVisualization();
  };

  const scrollToObservations = () => {
    document.getElementById('manager-section').scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToVisualization = () => {
    document.getElementById('visualization-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedComet = comets.find(c => c.id === selectedCometId);
  const orbitParamsForScene = selectedComet?.elements || defaultOrbitParams;

  return (
    <>
      <header data-aos="fade-down" data-aos-delay="200">
          <div className="container">
              <div className="content">
                  <div data-aos="fade-down-right" data-aos-delay="300" className="logo">
                      <img src="/assets/saturn.png" alt="logo" />
                      <a href="#">404: logic not found</a>
                  </div>
                  <div className="extra-nav"></div>
              </div>
          </div>
      </header>

      <a href="#" className="to-top"><i data-feather="chevron-up"></i></a>

      <section className="hero">
          <div className="container">
              <div className="content">
                  <div className="text">
                      <h1 data-aos="fade-up" data-aos-delay="200">Определение орбиты кометы</h1>
                      <p data-aos="fade-up" data-aos-delay="300">Отслеживайте <span>небесные объекты</span> и рассчитывайте их орбиты с помощью <span>современных алгоритмов</span> по <span>астрометрическим наблюдениям</span>.</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                          <a href="#" data-aos="fade-up" data-aos-delay="400" onClick={scrollToObservations}>Начать наблюдения</a>
                          <a href="#" data-aos="fade-up" data-aos-delay="500" onClick={scrollToVisualization} style={{ background: 'transparent', border: '2px solid var(--primary)' }}>Посмотреть 3D модель</a>
                      </div>
                  </div>
                  <div className="moon"></div>
              </div>
          </div>
      </section>

      {/* --- ВОТ ЭТА СЕКЦИЯ БЫЛА ПОТЕРЯНА. ТЕПЕРЬ ОНА НА МЕСТЕ --- */}
      <section className="status">
        {/* ... (содержимое секции status без изменений) ... */}
         <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-down" data-aos-delay="400">
              <h2>ТЕХНОЛОГИИ РАСЧЕТА</h2>
              <p>Используем современные алгоритмы определения орбит на основе методов Гаусса и наименьших квадратов для точного расчета траекторий небесных тел.</p>
            </div>
            <div className="planet">
              <div className="earth"><div className="moon"><div className="moon-desc"><p>Комета</p><hr/></div></div></div>
              <div className="desc desc-1"><p className="name" data-aos="fade-right" data-aos-delay="200">Точность расчета</p><hr data-aos="fade-right" data-aos-delay="200" /><p className="value" data-aos="fade-right" data-aos-delay="200">До 99.8%</p></div>
              <div className="desc desc-2"><p className="name" data-aos="fade-right" data-aos-delay="400">Минимальные наблюдения</p><hr data-aos="fade-right" data-aos-delay="400" /><p className="value" data-aos="fade-right" data-aos-delay="400">3 точки данных</p></div>
              <div className="desc desc-3"><p className="name" data-aos="fade-right" data-aos-delay="600">Время расчета</p><hr data-aos="fade-right" data-aos-delay="600" /><p className="value" data-aos="fade-right" data-aos-delay="600">Менее 1 секунды</p></div>
              <div className="desc desc-4"><p className="name" data-aos="fade-left" data-aos-delay="200">Алгоритм</p><hr data-aos="fade-left" data-aos-delay="200" /><p className="value" data-aos="fade-left" data-aos-delay="200">Метод Гаусса</p></div>
              <div className="desc desc-5"><p className="name" data-aos="fade-left" data-aos-delay="400">Координаты</p><hr data-aos="fade-left" data-aos-delay="400" /><p className="value" data-aos="fade-left" data-aos-delay="400">RA/Dec система</p></div>
              <div className="desc desc-6"><p className="name" data-aos="fade-left" data-aos-delay="600">Орбитальные параметры</p><hr data-aos="fade-left" data-aos-delay="600" /><p className="value" data-aos="fade-left" data-aos-delay="600">6 элементов</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="manager-section" className="why-us">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="400">
              <h2>СИСТЕМА УПРАВЛЕНИЯ</h2>
              <h1>Добавьте комету и ведите наблюдения</h1>
              <p>Создавайте новые объекты, переименовывайте их и добавляйте астрометрические наблюдения. Орбита будет пересчитываться автоматически.</p>
            </div>
            <div className="reason">
              <div className="card" data-aos="fade-up" data-aos-delay="400" style={{ width: '100%', height: 'auto' }}>
                {isLoading ? ( <p>Загрузка данных...</p> ) :
                 error ? ( <p style={{color: 'red'}}>{error}</p> ) : (
                  <ObservationForm
                    comets={comets}
                    onUpdate={handleCometsUpdate}
                    selectedCometId={selectedCometId}
                    setSelectedCometId={setSelectedCometId}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="visualization-section" className="visualization-3d">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="200">
              <h2>3D ВИЗУАЛИЗАЦИЯ ОРБИТЫ</h2>
              <h1>{selectedComet?.elements ? `Траектория кометы "${selectedComet.name}"` : 'Демонстрационная орбита'}</h1>
            </div>
            <div className="orbit-visualization" data-aos="fade-up" data-aos-delay="400">
              <div className="visualization-container">
                <CometOrbitScene orbitParams={orbitParamsForScene} />
              </div>
              <div className="orbit-info">
                {/* --- ВОТ ИЗМЕНЕНИЕ: проверяем selectedComet И selectedComet.elements --- */}
                {selectedComet && selectedComet.elements ? (
                  <ResultsDisplay
                    orbitParams={selectedComet.elements}
                    closeApproach={selectedComet.close_approach}
                    observations={selectedComet.observations}
                  />
                ) : (
                  <div className="calculation-info">
                    <p>
                      🌟 {(selectedComet)
                          ? `Для кометы "${selectedComet.name}" еще не рассчитана орбита. Необходимо минимум 3 наблюдения.`
                          : 'Комета не выбрана. Выберите объект из списка выше.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer><p>404: logic not found - Orbit Determinator</p></footer>
    </>
  );
}

export default App;
