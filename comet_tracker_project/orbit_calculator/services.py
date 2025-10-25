import numpy as np
from astropy.time import Time
from astropy.coordinates import SkyCoord, EarthLocation
import astropy.units as u

# Используем poliastro для IOD и расчетов орбит
from poliastro.iod import vallado
from poliastro.twobody import Orbit
from poliastro.bodies import Sun, Earth

from .models import Comet, Observation, OrbitalElements, CloseApproach

# Фиктивная точка наблюдения, поскольку точное местоположение обсерватории не указано
OBSERVER_LOCATION = EarthLocation(lon=0 * u.deg, lat=0 * u.deg, height=0 * u.m)

def parse_observation_data(observation):
    time = Time(observation.observation_time, scale='utc', location=OBSERVER_LOCATION)
    """Преобразует данные наблюдения Django в SkyCoord и Time Astropy."""

    # ❗️ ИСПРАВЛЕНИЕ: Используем числовые поля, хранящиеся в градусах
    ra = observation.ra_deg
    dec = observation.dec_deg

    # Создание SkyCoord (положение на небесной сфере)
    # Используем числовые значения (deg) напрямую
    sky_coord = SkyCoord(
        ra=ra * u.deg,
        dec=dec * u.deg,
        frame='icrs'  # Экваториальная система координат
    )

    # Время наблюдения
    # Примечание: Time.tdb лучше подходит для расчетов орбиты

    return sky_coord, time

def calculate_orbital_elements(comet: Comet) -> OrbitalElements:
    """
    Рассчитывает 6 орбитальных элементов по наблюдениям.

    ВНИМАНИЕ: Для реальной задачи нужно использовать итеративный метод
    подгонки орбиты (Least Squares Fit), а не простой IOD из трех точек.
    Здесь используется упрощенная схема для демонстрации.
    """

    observations = comet.observations.order_by('observation_time').all()
    if observations.count() < 3:
        raise ValueError("Требуется минимум 3 наблюдения для определения орбиты.")

    # Выбираем три наблюдения для метода Гаусса/Валладо (IOD)
    # Лучше использовать первое, среднее и последнее для максимального временного базиса
    obs_indices = [0, observations.count() // 2, observations.count() - 1]

    # Преобразование выбранных наблюдений в геоцентрические векторы
    rho_vectors = []
    times = []

    for i in obs_indices:
        obs = observations[i]
        sky_coord, time = parse_observation_data(obs)

        # Получение вектора радиуса-вектора Земли (r_earth)
        r_observer_gcrs = time.earth_location.get_gcrs(time)

        # Извлекаем декартов вектор
        r_earth = r_observer_gcrs.cartesian.xyz.to(u.au)

        rho_vectors.append(sky_coord.cartesian.xyz.value) # Единичный вектор
        times.append(time.tdb)

    # =================================================================
    # Расчет начальной орбиты с помощью poliastro (метод Валладо)
    # =================================================================

    # Временные интервалы
    dt1 = (times[1] - times[0]).to(u.day)
    dt3 = (times[2] - times[0]).to(u.day)

    # IOD: Получение начального вектора положения (r0) и скорости (v0)
    # r0, v0 - это векторы кометы относительно Солнца (гелиоцентрические)
    try:
        r0, v0 = vallado(
            k=Sun.k,
            r1=r_earth[0],  # Радиус-вектор Земли для первого наблюдения
            r2=r_earth[1],  # ... для второго
            r3=r_earth[2],  # ... для третьего
            rho1_hat=rho_vectors[0] * u.one,
            rho2_hat=rho_vectors[1] * u.one,
            rho3_hat=rho_vectors[2] * u.one,
            t1=times[0],
            t2=times[1],
            t3=times[2]
        )
    except Exception as e:
        # Обработка ошибки, если IOD не сходится
        raise RuntimeError(f"Ошибка при расчете IOD: {e}")

    # Создание объекта Orbit
    orbit = Orbit.from_vectors(
        Sun,
        r0.to(u.au),
        v0.to(u.au / u.day),
        times[0]
    )

    # Сохранение орбитальных элементов
    elements, created = OrbitalElements.objects.update_or_create(
        comet=comet,
        defaults={
            'semimajor_axis': orbit.a.to(u.au).value,
            'eccentricity': orbit.ecc.value,
            'inclination': orbit.inc.to(u.deg).value,
            'ra_of_node': orbit.raan.to(u.deg).value,
            'arg_of_pericenter': orbit.argp.to(u.deg).value,
            # T0 - время прохождения перигелия
            'time_of_pericenter': orbit.time_of_pericenter.datetime
        }
    )
    return elements

def predict_close_approach(elements: OrbitalElements):
    """
    Прогнозирует минимальное сближение кометы с Землей на основе
    рассчитанных орбитальных элементов.

    Использует итеративный поиск минимума расстояния.
    """

    # Создание объекта Orbit из сохраненных элементов
    # Углы должны быть в радианах для poliastro
    orbit = Orbit.from_classical(
        Sun,
        elements.semimajor_axis * u.au,
        elements.eccentricity * u.one,
        elements.inclination * u.deg,
        elements.ra_of_node * u.deg,
        elements.arg_of_pericenter * u.deg,
        elements.true_anomaly * u.deg, # Здесь должна быть истинная аномалия в T0,
                                       # но poliastro умеет работать с T0
        time=Time(elements.time_of_pericenter, scale='tdb')
    )

    # Определение интервала поиска (например, +/- 5 лет от текущей даты)
    current_time = Time.now()
    start_time = current_time - 5 * u.year
    end_time = current_time + 5 * u.year

    # Создание массива времени для поиска (например, 3650 точек = 10 лет с шагом 1 день)
    times = Time(
        np.linspace(start_time.jd, end_time.jd, 3650),
        format='jd',
        scale='tdb'
    )

    # 1. Рассчитать гелиоцентрическое положение кометы для всего интервала
    rr_comet = orbit.propagate(times).r

    # 2. Рассчитать гелиоцентрическое положение Земли для всего интервала
    # Используем Skyfield/Astropy для получения положения Земли (Earth)
    r_earth = Earth.at(times).to_frame('icrs').cartesian.xyz.to(u.au)

    # 3. Рассчитать расстояние между кометой и Землей: ||r_comet - r_earth||
    distance_vector = rr_comet - r_earth
    distances = np.linalg.norm(distance_vector.value, axis=0) * u.au

    # 4. Найти минимальное расстояние и соответствующую дату
    min_idx = np.argmin(distances)
    min_distance = distances[min_idx]
    min_time = times[min_idx]

    # Сохранение результата
    approach, created = CloseApproach.objects.update_or_create(
        orbital_elements=elements,
        defaults={
            'approach_date': min_time.datetime,
            'min_distance_au': min_distance.value
        }
    )
    return approach
