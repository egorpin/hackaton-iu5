import React, { useState, useEffect } from 'react';
import CometOrbitScene from './components/CometOrbitScene';
import ObservationForm from './components/ObservationForm';
import CometSelector from './components/CometSelector';
import ResultsDisplay from './components/ResultsDisplay';
import '../style.css';

function App() {
  // --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
  const [allComets, setAllComets] = useState([]); // Список всех комет с бэкенда
  const [activeComet, setActiveComet] = useState(null); // Выбранная комета для отображения
  const [isLoading, setIsLoading] = useState(true); // Флаг загрузки

  // Параметры для демо-орбиты (если загрузка с бэка не удалась)
  const defaultOrbitForScene = {
    semimajor_axis: 10.5,
    eccentricity: 0.85,
    inclination: 45,
    ra_of_node: 75,
    arg_of_pericenter: 120,
  };

  // --- Загрузка списка комет с бэкенда при первом запуске ---
  useEffect(() => {
    const fetchComets = async () => {
      try {
        // ❗️ ВАЖНО: ЗАМЕНИТЬ НА ПОЛНЫЙ URL ТВОЕГО БЭКЕНДА, ЕСЛИ ОН НА ДРУГОМ ПОРТУ
        // Например: 'http://127.0.0.1:8000/api/comets/'
        const response = await fetch('/api/comets/');

        if (!response.ok) {
          throw new Error(`Ошибка сети: ${response.status}`);
        }
        const data = await response.json();
        setAllComets(data);

        if (data && data.length > 0) {
          setActiveComet(data[0]); // Выбираем первую комету по умолчанию
        }
      } catch (error) {
        console.error("Не удалось загрузить кометы:", error);
        // В случае ошибки показываем демо-комету
        setActiveComet({ name: "Демо-комета", elements: defaultOrbitForScene });
      } finally {
        setIsLoading(false);
      }
    };

    fetchComets();

    // Код для анимации и скролла
    if (window.AOS) window.AOS.init();
    if (window.feather) window.feather.replace();
    headerScript();
  }, []);

  // --- ОБРАБОТЧИКИ ---

  // Выбор кометы из списка
  const handleSelectComet = (cometId) => {
    const selected = allComets.find(c => c.id === parseInt(cometId));
    setActiveComet(selected);
  };

  // Обработка новой кометы, рассчитанной на бэкенде
  const handleNewCometCalculated = (newCometData) => {
    // Добавляем новую комету в общий список
    setAllComets(prevComets => [...prevComets, newCometData]);
    // И сразу делаем ее активной для просмотра
    setActiveComet(newCometData);
    // Плавный скролл к результатам
    scrollToVisualization();
  };

  // --- Вспомогательные функции (скролл, анимация шапки) ---
  const headerScript = () => {
      let lastScrollTop = 0;
      const header = document.querySelector("header");
      const toTop = document.querySelector(".to-top");
      const heroSection = document.querySelector(".hero");
      if (!header || !toTop || !heroSection) return;
      window.addEventListener("scroll", () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > heroSection.offsetTop) toTop.classList.add("active");
        else toTop.classList.remove("active");
        if (scrollTop > lastScrollTop) header.classList.add("hidden");
        else header.classList.remove("hidden");
        lastScrollTop = scrollTop;
      });
  };
  const scrollToObservations = () => document.getElementById('observations-section').scrollIntoView({ behavior: 'smooth' });
  const scrollToVisualization = () => document.getElementById('visualization-section').scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <header data-aos="fade-down" data-aos-delay="200">
        <div className="container">
          <div className="content">
            <div data-aos="fade-down-right" data-aos-delay="300" className="logo">
              <img src="/assets/saturn.png" alt="logo" />
              <a href="#">404: logic not found</a>
            </div>
          </div>
        </div>
      </header>

      <a href="#" className="to-top"><i data-feather="chevron-up"></i></a>

      <section className="hero">
        <div className="container">
          <div className="content">
            <div className="text">
              <h1 data-aos="fade-up" data-aos-delay="200">Определение орбиты кометы</h1>
              <p data-aos="fade-up" data-aos-delay="300">
                Отслеживайте <span>небесные объекты</span> и рассчитывайте их орбиты
                с помощью <span>современных алгоритмов</span> определения траекторий
                по <span>астрометрическим наблюдениям</span>.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="#" data-aos="fade-up" data-aos-delay="400" onClick={scrollToObservations}>
                  Рассчитать новую
                </a>
                <a href="#" data-aos="fade-up" data-aos-delay="500" onClick={scrollToVisualization}
                   style={{ background: 'transparent', border: '2px solid var(--primary)' }}>
                  Посмотреть 3D модель
                </a>
              </div>
            </div>
            <div className="moon"></div>
          </div>
        </div>
      </section>

      <section className="status">{/* ... код секции без изменений ... */}</section>

      <section id="observations-section" className="why-us">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="400">
              <h2>РАССЧИТАТЬ НОВУЮ ОРБИТУ</h2>
              <h1>Введите данные наблюдений</h1>
              <p>Добавьте минимум 5 наблюдений для отправки на сервер и расчета орбиты новой кометы.</p>
            </div>
            <div className="reason">
              <div className="card" data-aos="fade-up" data-aos-delay="400" style={{ width: '100%', height: 'auto' }}>
                <ObservationForm onNewCometCalculated={handleNewCometCalculated} />
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
              <h1>{activeComet ? activeComet.name : 'Траектория движения кометы'}</h1>
              <p>Интерактивная 3D модель орбиты. Выберите существующую комету или рассчитайте новую.</p>
            </div>
            <div className="orbit-visualization" data-aos="fade-up" data-aos-delay="400">
              <div className="visualization-container">
                <CometOrbitScene orbitParams={activeComet?.elements} />
              </div>
              <div className="orbit-info">
                <div className="comet-selector-container">
                  {isLoading ? (
                    <p>Загрузка списка комет...</p>
                  ) : (
                    <CometSelector comets={allComets} onSelectComet={handleSelectComet} />
                  )}
                </div>
                {activeComet ? (
                  <ResultsDisplay
                    orbitParams={activeComet.elements}
                    closeApproach={activeComet.close_approach}
                    observations={activeComet.observations}
                  />
                ) : (
                  !isLoading && (
                    <div className="calculation-info">
                      <p>🌟 Нет комет для отображения. Рассчитайте новую!</p>
                      <button className="btn-primary" onClick={scrollToObservations} style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem' }}>
                        Перейти к вводу данных
                      </button>
                    </div>
                  )
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
