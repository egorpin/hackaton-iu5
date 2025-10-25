import numpy as np
from scipy.integrate import solve_ivp
from astropy.time import Time
from astropy.coordinates import SkyCoord, EarthLocation, GCRS, CartesianDifferential, CartesianRepresentation
import astropy.units as u
from astropy.constants import G, M_sun
from astropy.coordinates.builtin_frames import ICRS

from datetime import datetime

# =================================================================
# КОНСТАНТЫ И НАСТРОЙКИ
# =================================================================

# Гравитационная константа Солнца * масса Солнца
MU_SUN = (G * M_sun).to(u.au**3 / u.day**2).value # Используем без единиц для SciPy ODE

# Фиктивная точка наблюдения (используется как точка на поверхности Земли)
# В реальном приложении эта точка должна быть получена из данных обсерватории.
OBSERVER_LOCATION = EarthLocation(lon=0 * u.deg, lat=0 * u.deg, height=0 * u.m)

# =================================================================
# ПАРСИНГ И ПОДГОТОВКА ДАННЫХ
# =================================================================

def parse_observation_data(observation):
    """Преобразует данные наблюдения Django в SkyCoord и Time Astropy."""

    # RA и Dec хранятся в градусах
    sky_coord = SkyCoord(
        ra=observation.ra_deg * u.deg,
        dec=observation.dec_deg * u.deg,
        frame='icrs'
    )

    # Время наблюдения
    time = Time(observation.observation_time, scale='utc')

    return sky_coord, time

def get_observer_vector(time: Time) -> np.ndarray:
    """
    Рассчитывает геоцентрический вектор положения наблюдателя (r_earth)
    в системе GCRS для заданного момента времени.

    Возвращает вектор в u.au (значения numpy array).
    """
    r_observer_gcrs = OBSERVER_LOCATION.get_gcrs(time)
    r_earth = r_observer_gcrs.cartesian.xyz.to(u.au).value
    return r_earth


# =================================================================
# МАТЕМАТИКА НЕБЕСНОЙ МЕХАНИКИ (IOD и Конверсия)
# =================================================================

def cartesian_to_keplerian(r_vec: np.ndarray, v_vec: np.ndarray) -> dict:
    """
    Конвертирует гелиоцентрический вектор положения (r) и скорости (v)
    в 6 классических кеплеровых элементов.

    Векторы r_vec и v_vec должны быть в [au] и [au/day] соответственно (numpy.ndarray).
    """

    # --- 1. Применяем единицы измерения Astropy ---
    r = r_vec * u.au
    v = v_vec * u.au / u.day

    r_mag = np.linalg.norm(r_vec) * u.au
    v_mag = np.linalg.norm(v_vec) * u.au / u.day

    # Гравитационная константа mu
    mu_astropy = (G * M_sun).to(u.au**3 / u.day**2)

    # 2. Специфическая энергия (epsilon)
    # v_mag**2 / 2 - mu / r_mag. Теперь все - Quantity, операция разрешена.
    epsilon = v_mag**2 / 2 - mu_astropy / r_mag

    # 3. Большая полуось (a)
    a = -mu_astropy / (2 * epsilon)

    # 4. Вектор момента количества движения (h)
    h_vec = np.cross(r.value, v.value) * u.au**2 / u.day # Используем .value для np.cross
    h_mag = np.linalg.norm(h_vec)

    # 5. Вектор эксцентриситета (e_vec)
    # e_vec = (v x h) / mu - r / r_mag

    # np.cross(v, h) требует, чтобы V и H были без единиц.
    # v x h возвращает Quantity, если v и h - Quantity.
    # Но мы используем .value для np.cross выше. Давайте использовать чистый Astropy

    # Исправленный e_vec:
    e_vec_value = (np.cross(v.value, h_vec.value) / mu_astropy.value) - (r.value / r_mag.value)
    e_vec = e_vec_value * u.one # Вектор эксцентриситета безразмерный

    eccentricity = np.linalg.norm(e_vec) # Норма безразмерного вектора

    # 6. Наклонение (i)
    inclination = np.arccos(h_vec[2] / h_mag).to(u.deg) # Все Quantity

    # 7. Вектор узла N
    k_vec = np.array([0, 0, 1]) * u.one # Безразмерный единичный вектор
    N_vec = np.cross(k_vec.value, h_vec.value) * h_vec.unit # Единицы h
    N_mag = np.linalg.norm(N_vec)

    ra_of_node = np.arctan2(N_vec[1], N_vec[0]) * u.rad

    # 8. Аргумент перицентра (omega)
    # e_vec, N_vec должны быть безразмерными или иметь одинаковые единицы

    # Используем безразмерные значения для dot product:
    arg_of_pericenter = np.arccos(
        np.dot(N_vec.value, e_vec.value) / (N_mag.value * eccentricity.value)
    ) * u.rad

    # 9. Квадрант для omega
    # e_vec.value[2] - это безразмерное число
    if e_vec.value[2] < 0:
        arg_of_pericenter = 2 * np.pi * u.rad - arg_of_pericenter

    # 10. Время прохождения перицентра (T0) - Оставляем как заглушку (для полного расчета нужна итерация)
    time_of_pericenter = Time(Time.now(), scale='tdb').datetime

    # 11. Возврат результатов
    return {
        'a': a.to(u.au).value,
        'e': eccentricity.value,
        'i': inclination.to(u.deg).value,
        'Omega': ra_of_node.to(u.deg).value % 360,
        'omega': arg_of_pericenter.to(u.deg).value % 360,
        'T0': time_of_pericenter,
        'rms_error': np.nan
    }


# =================================================================
# ОСНОВНЫЕ СЕРВИСНЫЕ ФУНКЦИИ
# =================================================================

def calculate_orbital_elements(comet) -> 'OrbitalElements':
    """
    Рассчитывает 6 орбитальных элементов по наблюдениям с использованием
    упрощенного метода IOD (Гаусса).
    """
    from .models import OrbitalElements

    observations = comet.observations.order_by('observation_time').all()
    if observations.count() < 3:
        raise ValueError("Требуется минимум 3 наблюдения для определения орбиты.")

    i1, i2, i3 = 0, observations.count() // 2, observations.count() - 1

    obs_data = []
    for i in [i1, i2, i3]:
        sky_coord, time = parse_observation_data(observations[i])

        obs_data.append({
            'r_earth': get_observer_vector(time),
            'rho_hat': sky_coord.cartesian.xyz.value,
            'time': time.tdb.jd
        })

    # --- УПРОЩЕННЫЙ МЕТОД ГАУССА (только для демонстрации) ---
    dt1 = obs_data[0]['time'] - obs_data[1]['time']
    dt3 = obs_data[2]['time'] - obs_data[1]['time']
    tau1 = dt1
    tau3 = dt3

    r_earth2 = obs_data[1]['r_earth']
    r_earth2_mag = np.linalg.norm(r_earth2)

    # Грубая оценка (r2_mag) - необходима для начального IOD
    r2_mag_guess = r_earth2_mag

    r2 = r_earth2 + r2_mag_guess * obs_data[1]['rho_hat'] # r2 = r_earth + rho * rho_hat
    r2_mag = np.linalg.norm(r2)

    # Коэффициенты Лагранжа (приблизительно)
    f1 = 1 - 0.5 * MU_SUN / r2_mag**3 * tau1**2
    g1 = tau1 - (1/6) * MU_SUN / r2_mag**3 * tau1**3

    f3 = 1 - 0.5 * MU_SUN / r2_mag**3 * tau3**2
    g3 = tau3 - (1/6) * MU_SUN / r2_mag**3 * tau3**3

    # Очень грубый расчет вектора скорости v2
    v2 = (r2 * (g3 - f3 * tau1 / tau3) + r_earth2 * (f3 * dt1 / dt3 - f1)) / (g1 * g3 - g3 * f1) # Упрощено

    # ----------------------------------------------------------------------
    # 2. Конвертация (r, v) -> Кеплеровы элементы
    # ----------------------------------------------------------------------

    try:
        elements_kep = cartesian_to_keplerian(r2, v2)
    except Exception as e:
        raise RuntimeError(f"Ошибка при конвертации IOD в элементы: {e}")

    # 3. Сохранение орбитальных элементов
    elements, created = OrbitalElements.objects.update_or_create(
        comet=comet,
        defaults={
            'semimajor_axis': elements_kep['a'],
            'eccentricity': elements_kep['e'],
            'inclination': elements_kep['i'],
            'ra_of_node': elements_kep['Omega'],
            'arg_of_pericenter': elements_kep['omega'],
            'time_of_pericenter': elements_kep['T0'],
            'rms_error': elements_kep['rms_error']
        }
    )
    return elements


def two_body_ode(t, y, mu):
    """
    Обыкновенное дифференциальное уравнение для задачи двух тел.
    y = [rx, ry, rz, vx, vy, vz]
    """
    r_vec = y[:3]
    r_mag = np.linalg.norm(r_vec)

    # Ускорение = - (mu / r^3) * r
    accel = -mu / r_mag**3 * r_vec

    return np.array([y[3], y[4], y[5], accel[0], accel[1], accel[2]])

def predict_close_approach(elements: 'OrbitalElements'):
    """
    Прогнозирует минимальное сближение кометы с Землей
    с использованием численного интегрирования.
    """
    from .models import CloseApproach

    # 1. Начальное состояние (r0, v0) - должно быть получено обратной конвертацией.
    # ❗️ Здесь используется заглушка, так как ручная конверсия (a, e, i...) -> (r, v) отсутствует.
    r0 = np.array([1.0, 0.0, 0.0]) # au
    v0 = np.array([0.0, 0.005, 0.0]) # au/day

    t0 = Time(elements.time_of_pericenter, scale='tdb')
    initial_state = np.concatenate([r0, v0])

    # 2. Интервал поиска (5 лет, шаг 1 день)
    T_START = 0
    T_END = 5 * 365.25
    t_span = [T_START, T_END]
    t_eval = np.linspace(T_START, T_END, int(T_END)) # Оценка каждые 1 день

    # 3. Численное интегрирование (распространение орбиты кометы)
    sol = solve_ivp(
        two_body_ode,
        t_span,
        initial_state,
        args=(MU_SUN,), # Передаем MU_SUN без единиц
        t_eval=t_eval
    )

    times_prop = t0 + sol.t * u.day
    r_comet_prop = sol.y[:3].T # Транспонируем для получения [N, 3]

    # 4. Расчет гелиоцентрического положения Земли (Earth's heliocentric position)
    # Используем Astropy для получения вектора Земли (GCRS/ICRS)
    r_earth_icrs = GCRS(
        CartesianRepresentation(
            get_observer_vector(times_prop) * u.au
        ),
        obstime=times_prop
    ).transform_to(ICRS).cartesian.xyz.to(u.au).value.T

    # 5. Расчет расстояния между кометой и Землей
    distance_vector = r_comet_prop - r_earth_icrs
    distances = np.linalg.norm(distance_vector, axis=1) * u.au

    # 6. Найти минимальное расстояние
    min_idx = np.argmin(distances)
    min_distance = distances[min_idx]
    min_time = times_prop[min_idx]

    # 7. Сохранение результата
    approach, created = CloseApproach.objects.update_or_create(
        elements=elements,
        defaults={
            'approach_date': min_time.datetime,
            'min_distance_au': min_distance.value
        }
    )
    return approach
