import numpy as np
from astropy import units as u
from astropy.time import Time
from astropy.coordinates import EarthLocation, get_body_barycentric_posvel
# ИСПРАВЛЕНИЕ: Импортируем модуль poliastro.iod целиком
import poliastro.iod as iod
from poliastro.twobody import Orbit
from poliastro.bodies import Sun, Earth
from poliastro.frames import Planes
from poliastro.core.elements import rv2coe
from poliastro.util import time_range
import datetime

# Импорт моделей Django для type hinting (предполагается, что они в .models)
# Вам нужно убедиться, что .models импортируется корректно в вашей среде Django
try:
    from .models import Comet, Observation, OrbitalElements, CloseApproach
except ImportError:
    # Заглушка, если models.py недоступен напрямую (для целей демонстрации)
    class Comet: pass
    class Observation: pass
    class OrbitalElements: pass
    class CloseApproach: pass


# Гравитационный параметр Солнца (mu)
K = Sun.k

def calculate_orbital_elements(comet: Comet) -> OrbitalElements | None:
    """
    Рассчитывает 6 орбитальных элементов кометы из ее наблюдений
    и сохраняет их в базе данных, используя метод Гаусса (iod.gauss).
    """

    # 1. Сбор и подготовка данных наблюдений
    # В реальном приложении: observations = comet.observations.order_by('observation_time')
    observations = [] # Замените на реальное получение данных из Comet.observations
    if observations.count() < 3:
        # Для корректной работы здесь нужно реальное получение данных
        pass

    # --- ФИКТИВНЫЕ ДАННЫЕ для прохождения IOD, если нет модели Django ---
    # В реальной системе замените это на код выше
    if observations.count() == 0:
        raise ValueError("Ошибка: Невозможно получить данные наблюдений кометы из базы.")

    times = Time([obs.observation_time for obs in observations], scale='utc')
    ra_coords = [obs.ra_deg for obs in observations] * u.deg
    dec_coords = [obs.dec_deg for obs in observations] * u.deg
    # ----------------------------------------------------------------------


    # 2. Позиция наблюдателя (Земли) относительно Солнца
    r_earth, _ = get_body_barycentric_posvel('earth', times, center=Sun)

    # 3. Initial Orbit Determination (IOD) - Метод Гаусса

    # Для метода Гаусса берем первые три наблюдения
    try:
        # Положение Земли относительно Солнца в 3-х точках
        r_obs = r_earth.cartesian.xyz[:, [0, 1, 2]].to(u.km).T
        ras = ra_coords[[0, 1, 2]]
        decs = dec_coords[[0, 1, 2]]
        t_iod = times[[0, 1, 2]]

        # ИСПРАВЛЕННЫЙ ВЫЗОВ: iod.gauss
        r_vector, v_vector = iod.gauss(K, r_obs, ras, decs, t_iod)

    except Exception as e:
        print(f"IOD failed: {e}")
        return None


    # 4. Создание объекта Orbit
    epoch = times[1]
    orbit = Orbit.from_vectors(Sun, r_vector, v_vector, epoch=epoch, plane=Planes.EARTH_EQUATOR)

    # 5. Извлечение 6 классических орбитальных элементов (COEs)
    a_au = orbit.a.to(u.au).value
    ecc = orbit.ecc.value
    inc_deg = orbit.inc.to(u.deg).value
    raan_deg = orbit.raan.to(u.deg).value # Ω
    argp_deg = orbit.argp.to(u.deg).value # ω

    # Расчет T0 - времени прохождения перигелия
    M = orbit.M
    time_to_pericenter = orbit.time_to_anomaly(M * 0 * u.rad)
    time_of_pericenter = (epoch - time_to_pericenter).to_datetime(timezone=datetime.UTC)


    # 6. Сохранение орбитальных элементов в базе
    # В реальном приложении:
    # elements, created = OrbitalElements.objects.update_or_create(...)
    elements = OrbitalElements(
        comet=comet,
        semimajor_axis=a_au,
        eccentricity=ecc,
        inclination=inc_deg,
        ra_of_node=raan_deg,
        arg_of_pericenter=argp_deg,
        time_of_pericenter=time_of_pericenter,
        rms_error=None,
    )
    return elements


def predict_close_approach(elements: OrbitalElements):
    """
    Прогнозирует минимальное сближение кометы с Землей.
    """

    # 1. Восстановление объекта Orbit из элементов
    epoch_t0 = Time(elements.time_of_pericenter, scale='utc')

    orbit = Orbit.from_classical(
        Sun,
        elements.semimajor_axis * u.au,
        elements.eccentricity * u.one,
        elements.inclination * u.deg,
        elements.ra_of_node * u.deg,
        elements.arg_of_pericenter * u.deg,
        0 * u.deg, # True Anomaly (ν) = 0 в момент T0
        epoch=epoch_t0,
        plane=Planes.EARTH_EQUATOR
    )

    # 2. Выбор временного диапазона для поиска сближения
    start_time = Time.now()
    end_time = start_time + 365.25 * u.day

    # Генерируем точки на орбите
    times = time_range(start_time, end=end_time, periods=1000)

    # Пропаганда (вычисление позиций)
    r_comet = orbit.propagate(times).r

    # 3. Позиция Земли относительно Солнца
    r_earth, _ = get_body_barycentric_posvel('earth', times, center=Sun)

    # 4. Расстояние между кометой и Землей
    rho = r_comet - r_earth
    distances = np.linalg.norm(rho, axis=1)

    # 5. Поиск минимального расстояния
    min_distance_au = np.min(distances).to(u.au)
    min_index = np.argmin(distances)
    approach_time = times[min_index]

    # 6. Сохранение прогноза сближения
    # В реальном приложении:
    # approach, created = CloseApproach.objects.update_or_create(...)
    approach = CloseApproach(
        elements=elements,
        approach_date=approach_time.to_datetime(timezone=datetime.UTC),
        min_distance_au=min_distance_au.value
    )
    return approach


def example_mars_orbit():
    """
    Пример расчета орбитальных элементов для Марса.
    """

    # 1. Время для расчета (J2000.0)
    epoch = Time(2451545.0, format='jd', scale='tdb')

    # 2. Создание Orbit для Марса из эфемерид
    mars_orbit = Orbit.from_body_ephem(Earth, epoch=epoch, center=Sun)

    # 3. Извлечение элементов
    a_au = mars_orbit.a.to(u.au).value
    ecc = mars_orbit.ecc.value
    inc_deg = mars_orbit.inc.to(u.deg).value
    raan_deg = mars_orbit.raan.to(u.deg).value
    argp_deg = mars_orbit.argp.to(u.deg).value

    # Расчет T0 (время прохождения перигелия)
    M = mars_orbit.M
    time_to_pericenter = mars_orbit.time_to_anomaly(M * 0 * u.rad)
    time_of_pericenter = (epoch - time_to_pericenter).to_datetime(timezone=datetime.UTC)

    # 4. Вывод результата
    print("="*60)
    print("ОРБИТАЛЬНЫЕ ЭЛЕМЕНТЫ МАРСА (Гелиоцентрические, на эпоху J2000.0)")
    print(f"Большая полуось (a): {a_au:.6f} a.e.")
    print(f"Эксцентриситет (e): {ecc:.6f}")
    print(f"Наклонение (i): {inc_deg:.6f} град")
    print(f"Долгота восходящего узла (Ω): {raan_deg:.6f} град")
    print(f"Аргумент перицентра (ω): {argp_deg:.6f} град")
    print(f"Время прохождения перигелия (T0): {time_of_pericenter}")
    print("="*60)

if __name__ == '__main__':
    # Пример вызова для Марса
    example_mars_orbit()
