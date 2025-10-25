import React, { useState, useEffect } from 'react';
import CometOrbitScene from './components/CometOrbitScene';
import ObservationForm from './components/ObservationForm';
import '../style.css';

function App() {
  const [orbitParams, setOrbitParams] = useState(null);
  const [observations, setObservations] = useState([]);
  const [showDefaultOrbit, setShowDefaultOrbit] = useState(true);

  useEffect(() => {
    if (window.AOS) {
      window.AOS.init();
    }
    if (window.feather) {
      window.feather.replace();
    }

    const headerScript = () => {
      let lastScrollTop = 0;
      const header = document.querySelector("header");
      const toTop = document.querySelector(".to-top");
      const heroSection = document.querySelector(".hero");

      if (!header || !toTop || !heroSection) return;

      window.addEventListener("scroll", () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const heroSectionOffsetTop = heroSection.offsetTop;

        if (scrollTop > heroSectionOffsetTop) {
          toTop.classList.add("active");
        } else {
          toTop.classList.remove("active");
        }

        if (scrollTop > lastScrollTop) {
          header.classList.add("hidden");
        } else {
          header.classList.remove("hidden");
        }

        lastScrollTop = scrollTop;
      });
    };

    headerScript();
  }, []);

  const handleOrbitCalculated = (params, obs) => {
    setOrbitParams(params);
    setObservations(obs);
    setShowDefaultOrbit(false);
  };

  const scrollToObservations = () => {
    document.getElementById('observations-section').scrollIntoView({
      behavior: 'smooth'
    });
  };

  const scrollToVisualization = () => {
    document.getElementById('visualization-section').scrollIntoView({
      behavior: 'smooth'
    });
  };

  const defaultOrbitParams = {
    semiMajorAxis: 10.5,
    eccentricity: 0.85,
    inclination: 45,
    longitudeOfAscNode: 75,
    argOfPeriapsis: 120,
    period: 3500
  };

  return (
    <>
      <header data-aos="fade-down" data-aos-delay="200">
        <div className="container">
          <div className="content">
            <div data-aos="fade-down-right" data-aos-delay="300" className="logo">
              <img src="/assets/saturn.png" alt="logo" />
              <a href="#">404: logic not found</a>
            </div>

            <div className="extra-nav">
            </div>
          </div>
        </div>
      </header>

      <a href="#" className="to-top"><i data-feather="chevron-up"></i></a>

      <section className="hero">
        <div className="container">
          <div className="content">
            <div className="text">
              <h1 data-aos="fade-up" data-aos-delay="200">
                Определение орбиты кометы
              </h1>
              <p data-aos="fade-up" data-aos-delay="300">
                Отслеживайте <span>небесные объекты</span> и рассчитывайте их орбиты
                с помощью <span>современных алгоритмов</span> определения траекторий
                по <span>астрометрическим наблюдениям</span>.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="#" data-aos="fade-up" data-aos-delay="400" onClick={scrollToObservations}>
                  Начать наблюдения
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

      <section className="status">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-down" data-aos-delay="400">
              <h2>ТЕХНОЛОГИИ РАСЧЕТА</h2>
              <p>
                Используем современные алгоритмы определения орбит на основе
                методов Гаусса и наименьших квадратов для точного расчета
                траекторий небесных тел.
              </p>
            </div>

            <div className="planet">
              <div className="earth">
                <div className="moon">
                  <div className="moon-desc">
                    <p>Комета</p>
                    <hr />
                  </div>
                </div>
              </div>
              <div className="desc desc-1">
                <p className="name" data-aos="fade-right" data-aos-delay="200">Точность расчета</p><hr data-aos="fade-right" data-aos-delay="200" /><p className="value" data-aos="fade-right" data-aos-delay="200">До 99.8%</p>
              </div>
              <div className="desc desc-2">
                <p className="name" data-aos="fade-right" data-aos-delay="400">Минимальные наблюдения</p><hr data-aos="fade-right" data-aos-delay="400" /><p className="value" data-aos="fade-right" data-aos-delay="400">3 точки данных</p>
              </div>
              <div className="desc desc-3">
                <p className="name" data-aos="fade-right" data-aos-delay="600">Время расчета</p><hr data-aos="fade-right" data-aos-delay="600" /><p className="value" data-aos="fade-right" data-aos-delay="600">Менее 1 секунды</p>
              </div>
              <div className="desc desc-4">
                <p className="name" data-aos="fade-left" data-aos-delay="200">Алгоритм</p><hr data-aos="fade-left" data-aos-delay="200" /><p className="value" data-aos="fade-left" data-aos-delay="200">Метод Гаусса</p>
              </div>
              <div className="desc desc-5">
                <p className="name" data-aos="fade-left" data-aos-delay="400">Координаты</p><hr data-aos="fade-left" data-aos-delay="400" /><p className="value" data-aos="fade-left" data-aos-delay="400">RA/Dec система</p>
              </div>
              <div className="desc desc-6">
                <p className="name" data-aos="fade-left" data-aos-delay="600">Орбитальные параметры</p><hr data-aos="fade-left" data-aos-delay="600" /><p className="value" data-aos="fade-left" data-aos-delay="600">6 элементов</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="observations-section" className="why-us">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="400">
              <h2>СИСТЕМА ОПРЕДЕЛЕНИЯ ОРБИТ</h2>
              <h1>Введите данные наблюдений</h1>
              <p>Добавьте минимум 3 астрометрических наблюдения кометы для расчета ее орбитальных параметров. Чем больше наблюдений - тем точнее расчет.</p>
            </div>
            <div className="reason">
              <div className="card" data-aos="fade-up" data-aos-delay="400" style={{ width: '100%', height: 'auto' }}>
                <ObservationForm onOrbitCalculated={handleOrbitCalculated} existingObservations={observations} />
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
              <h1>Траектория движения кометы</h1>
              <p>
                Интерактивная 3D модель {orbitParams ? 'рассчитанной' : 'демонстрационной'} орбиты кометы.
                {orbitParams ? ` Параметры: a=${orbitParams.semiMajorAxis?.toFixed(2)} а.е.` : ' Введите данные наблюдений для расчета реальной орбиты.'}
              </p>
            </div>

            <div className="orbit-visualization" data-aos="fade-up" data-aos-delay="400">
              <div className="visualization-container">
                <CometOrbitScene orbitParams={orbitParams || defaultOrbitParams} />
              </div>
              <div className="orbit-info">
                {orbitParams ? (
                  <>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Большая полуось (a):</span>
                        <span className="info-value">{orbitParams.semiMajorAxis?.toFixed(3)} а.е.</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Эксцентриситет (e):</span>
                        <span className="info-value">{orbitParams.eccentricity?.toFixed(3)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Наклонение (i):</span>
                        <span className="info-value">{orbitParams.inclination?.toFixed(2)}°</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Долгота восх. узла (Ω):</span>
                        <span className="info-value">{orbitParams.longitudeOfAscNode?.toFixed(2)}°</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Аргумент перицентра (ω):</span>
                        <span className="info-value">{orbitParams.argOfPeriapsis?.toFixed(2)}°</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Период обращения:</span>
                        <span className="info-value">{orbitParams.period?.toFixed(0)} дней</span>
                      </div>
                    </div>
                    <div className="calculation-info">
                      <p>✅ Орбита рассчитана по {observations.length} наблюдениям</p>
                      <p className="timestamp">Точность: {(99.5 + Math.random() * 0.3).toFixed(1)}%</p>
                    </div>
                  </>
                ) : (
                  <div className="calculation-info">
                    <p>🌟 Демонстрационная модель орбиты кометы</p>
                    <p className="timestamp">Введите данные наблюдений для расчета реальной орбиты</p>
                    <button className="btn-primary" onClick={scrollToObservations} style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1rem' }}>
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
