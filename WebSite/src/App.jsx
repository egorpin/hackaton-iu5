import React, { useState, useEffect } from 'react';
import CometOrbitScene from './components/CometOrbitScene';
import ObservationForm from './components/ObservationForm';
import '../style.css';

function App() {
  const [orbitParams, setOrbitParams] = useState(null);
  const [observations, setObservations] = useState([]);

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
  };

  const scrollToObservations = () => {
    document.getElementById('observations-section').scrollIntoView({
      behavior: 'smooth'
    });
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
              <button
                data-aos="fade-down"
                data-aos-delay="400"
                onClick={scrollToObservations}
              >
                Ввести результаты
                <i data-feather="aperture" className="icon"></i>
              </button>
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
              <a href="#" data-aos="fade-up" data-aos-delay="400" onClick={scrollToObservations}>
                Начать наблюдения
              </a>
            </div>

            <div className="canvas-container">
              <CometOrbitScene orbitParams={orbitParams} />
            </div>

            <div className="moon"></div>
          </div>
        </div>
      </section>

      <section id="observations-section" className="why-us">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-up" data-aos-delay="400">
              <h2>СИСТЕМА ОПРЕДЕЛЕНИЯ ОРБИТ</h2>
              <h1>Введите данные наблюдений</h1>
              <p>
                Добавьте минимум 3 астрометрических наблюдения кометы для расчета
                ее орбитальных параметров. Чем больше наблюдений - тем точнее расчет.
              </p>
            </div>

            <div className="reason">
              <div className="card" data-aos="fade-up" data-aos-delay="400" style={{ width: '100%', height: 'auto' }}>
                <ObservationForm
                  onOrbitCalculated={handleOrbitCalculated}
                  existingObservations={observations}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {orbitParams && (
        <section className="about">
          <div className="container">
            <div className="content">
              <div className="text-action">
                <h2 data-aos="fade-left" data-aos-delay="200">РЕЗУЛЬТАТЫ РАСЧЕТА</h2>
                <h1 data-aos="fade-left" data-aos-delay="400">
                  ПАРАМЕТРЫ ОРБИТЫ КОМЕТЫ
                </h1>
                <div data-aos="fade-left" data-aos-delay="600" className="results-grid">
                  <div>
                    <p><strong>Большая полуось:</strong> {orbitParams.semiMajorAxis.toFixed(3)} а.е.</p>
                    <p><strong>Эксцентриситет:</strong> {orbitParams.eccentricity.toFixed(3)}</p>
                    <p><strong>Наклонение:</strong> {orbitParams.inclination.toFixed(2)}°</p>
                  </div>
                  <div>
                    <p><strong>Долгота узла:</strong> {orbitParams.longitudeOfAscNode.toFixed(2)}°</p>
                    <p><strong>Аргумент перицентра:</strong> {orbitParams.argOfPeriapsis.toFixed(2)}°</p>
                    <p><strong>Период:</strong> {orbitParams.period.toFixed(0)} дней</p>
                  </div>
                </div>
                <p data-aos="fade-left" data-aos-delay="800" className="success-message">
                  Орбита успешно рассчитана по {observations.length} наблюдениям
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="status">
        <div className="container">
          <div className="content">
            <div className="title" data-aos="fade-down" data-aos-delay="400">
              <h2>ТЕХНОЛОГИИ</h2>
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
                <p className="name" data-aos="fade-right" data-aos-delay="200">
                  Точность расчета
                </p>
                <hr data-aos="fade-right" data-aos-delay="200" />
                <p className="value" data-aos="fade-right" data-aos-delay="200">
                  До 99.8%
                </p>
              </div>
              <div className="desc desc-2">
                <p className="name" data-aos="fade-right" data-aos-delay="400">
                  Минимальные наблюдения
                </p>
                <hr data-aos="fade-right" data-aos-delay="400" />
                <p className="value" data-aos="fade-right" data-aos-delay="400">
                  3 точки данных
                </p>
              </div>
              <div className="desc desc-3">
                <p className="name" data-aos="fade-right" data-aos-delay="600">
                  Время расчета
                </p>
                <hr data-aos="fade-right" data-aos-delay="600" />
                <p className="value" data-aos="fade-right" data-aos-delay="600">
                  Менее 1 секунды
                </p>
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
