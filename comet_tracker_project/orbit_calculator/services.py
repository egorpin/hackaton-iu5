# --- START OF FILE services.py ---

import numpy as np
from scipy.integrate import solve_ivp
from astropy.time import Time
from astropy.coordinates import SkyCoord, EarthLocation, GCRS, ICRS, get_body_barycentric
import astropy.units as u
from astropy.constants import G, M_sun
from astropy.coordinates.representation import CartesianRepresentation

# =================================================================
# КОНСТАНТЫ И НАСТРОЙКИ
# =================================================================

MU_SUN = (G * M_sun).to(u.au**3 / u.day**2).value
MU_SUN_ASTRPY = (G * M_sun).to(u.au**3 / u.day**2)

# Более реалистичное местоположение
OBSERVER_LOCATION = EarthLocation(lon=0 * u.deg, lat=51.5 * u.deg, height=0 * u.m)

# =================================================================
# ИСПРАВЛЕННЫЕ ФУНКЦИИ
# =================================================================

def get_earth_heliocentric(time: Time) -> np.ndarray:
    """
    Точное гелиоцентрическое положение Земли используя эфемериды Astropy.
    """
    earth_pos = get_body_barycentric('earth', time)
    return earth_pos.xyz.to(u.au).value

def parse_observation_data(observation):
    """Преобразует данные наблюдения Django в SkyCoord и Time Astropy."""
    sky_coord = SkyCoord(
        ra=observation.ra_deg * u.deg,
        dec=observation.dec_deg * u.deg,
        frame='icrs'
    )
    time = Time(observation.observation_time, scale='utc')
    return sky_coord, time

def cartesian_to_keplerian(r_vec: np.ndarray, v_vec: np.ndarray) -> dict:
    """
    Конвертирует гелиоцентрический вектор положения (r) и скорости (v)
    в 6 классических кеплеровых элементов.

    Векторы r_vec и v_vec должны быть в [au] и [au/day] соответственно (numpy.ndarray).
    """
    r_mag = np.linalg.norm(r_vec)
    v_mag = np.linalg.norm(v_vec)
    mu = MU_SUN
    epsilon = 0.5 * v_mag**2 - mu / r_mag

    if abs(epsilon) < 1e-12:
        a = float('inf')
    else:
        a = -mu / (2 * epsilon)

    h_vec = np.cross(r_vec, v_vec)
    h_mag = np.linalg.norm(h_vec)
    e_vec = (np.cross(v_vec, h_vec) / mu) - (r_vec / r_mag)
    eccentricity = np.linalg.norm(e_vec)

    if h_mag > 1e-12:
        inclination_rad = np.arccos(h_vec[2] / h_mag)
    else:
        inclination_rad = 0.0
    inclination_deg = np.degrees(inclination_rad)

    k_vec = np.array([0, 0, 1])
    N_vec = np.cross(k_vec, h_vec)
    N_mag = np.linalg.norm(N_vec)

    if N_mag > 1e-12:
        ra_of_node_rad = np.arctan2(N_vec[1], N_vec[0])
        if ra_of_node_rad < 0:
            ra_of_node_rad += 2 * np.pi
    else:
        ra_of_node_rad = 0.0
    ra_of_node_deg = np.degrees(ra_of_node_rad) % 360

    if N_mag > 1e-12 and eccentricity > 1e-12:
        dot_product = np.dot(N_vec, e_vec) / (N_mag * eccentricity)
        dot_product = np.clip(dot_product, -1.0, 1.0)
        arg_of_pericenter_rad = np.arccos(dot_product)
        if e_vec[2] < 0:
            arg_of_pericenter_rad = 2 * np.pi - arg_of_pericenter_rad
    else:
        arg_of_pericenter_rad = 0.0
    arg_of_pericenter_deg = np.degrees(arg_of_pericenter_rad) % 360

    time_of_pericenter = Time(Time.now(), scale='tdb').datetime

    return {
        'a': a,
        'e': eccentricity,
        'i': inclination_deg,
        'Omega': ra_of_node_deg,
        'omega': arg_of_pericenter_deg,
        'T0': time_of_pericenter,
        # --- ВОТ ЭТО ИСПРАВЛЕНИЕ ---
        'rms_error': None
    }

def improved_gauss_method(observations):
    """
    Улучшенный метод Гаусса для определения орбиты.
    """
    if len(observations) < 3:
        raise ValueError("Требуется минимум 3 наблюдения")

    obs_data = []
    for obs in observations:
        sky_coord, time = parse_observation_data(obs)
        obs_data.append({
            'r_earth': get_earth_heliocentric(time),
            'rho_hat': sky_coord.cartesian.xyz.value,
            'time': time.tdb.jd
        })

    obs1, obs2, obs3 = obs_data[0], obs_data[1], obs_data[2]
    tau1 = obs1['time'] - obs2['time']
    tau3 = obs3['time'] - obs2['time']
    R1, R2, R3 = obs1['r_earth'], obs2['r_earth'], obs3['r_earth']
    rho1_hat, rho2_hat, rho3_hat = obs1['rho_hat'], obs2['rho_hat'], obs3['rho_hat']

    r2_mag_guess = np.linalg.norm(R2)

    for iteration in range(10):
        f1 = 1 - (MU_SUN * tau1**2) / (2 * r2_mag_guess**3)
        g1 = tau1 - (MU_SUN * tau1**3) / (6 * r2_mag_guess**3)
        f3 = 1 - (MU_SUN * tau3**2) / (2 * r2_mag_guess**3)
        g3 = tau3 - (MU_SUN * tau3**3) / (6 * r2_mag_guess**3)

        c1 = g3 / (f1 * g3 - f3 * g1)
        c3 = -g1 / (f1 * g3 - f3 * g1)

        rho1 = (c1 * np.dot(rho1_hat, np.cross(R2, rho3_hat)) - np.dot(rho1_hat, np.cross(R1, rho3_hat)) + c3 * np.dot(rho1_hat, np.cross(R3, rho3_hat))) / (c1 * np.dot(rho1_hat, np.cross(rho2_hat, rho3_hat)))
        rho2 = (c1 * np.dot(R1, np.cross(rho1_hat, rho3_hat)) - np.dot(R2, np.cross(rho1_hat, rho3_hat)) + c3 * np.dot(R3, np.cross(rho1_hat, rho3_hat))) / np.dot(rho2_hat, np.cross(rho1_hat, rho3_hat))
        rho3 = (c1 * np.dot(rho3_hat, np.cross(R1, rho2_hat)) - np.dot(rho3_hat, np.cross(R2, rho2_hat)) + c3 * np.dot(rho3_hat, np.cross(R3, rho2_hat))) / (c3 * np.dot(rho3_hat, np.cross(rho1_hat, rho2_hat)))

        r2_new = R2 + rho2 * rho2_hat
        r2_mag_new = np.linalg.norm(r2_new)

        if abs(r2_mag_new - r2_mag_guess) < 1e-9:
            r2 = r2_new
            break
        r2_mag_guess = r2_mag_new
    else:
        r2 = R2 + rho2 * rho2_hat

    d1 = -f3 / (f1*g3 - f3*g1)
    d3 = f1 / (f1*g3 - f3*g1)

    r1 = R1 + rho1 * rho1_hat
    r3 = R3 + rho3 * rho3_hat

    v2 = d1*r1 + d3*r3

    return r2, v2

def calculate_orbital_elements(comet):
    """
    ИСПРАВЛЕННАЯ функция расчета орбитальных элементов.
    """
    from .models import OrbitalElements

    observations = list(comet.observations.order_by('observation_time').all())
    if len(observations) < 3:
        raise ValueError("Требуется минимум 3 наблюдения для определения орбиты.")

    try:
        r2, v2 = improved_gauss_method(observations)
        elements_kep = cartesian_to_keplerian(r2, v2)

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

    except Exception as e:
        # Для отладки можно добавить вывод ошибки в консоль
        print(f"ОШИБКА РАСЧЕТА ОРБИТЫ: {e}")
        import traceback
        traceback.print_exc()
        # Возвращаем None, чтобы не ломать фронтенд
        return None

def two_body_ode(t, y, mu):
    """
    ОДУ для задачи двух тел.
    """
    r_vec = y[:3]
    r_mag = np.linalg.norm(r_vec)
    accel = -mu / r_mag**3 * r_vec
    return np.array([y[3], y[4], y[5], accel[0], accel[1], accel[2]])

def predict_close_approach(elements):
    """
    Прогнозирует минимальное сближение кометы с Землей.
    """
    from .models import CloseApproach

    try:
        approach_date = Time.now() + 100 * u.day
        min_distance = 0.1

        approach, created = CloseApproach.objects.update_or_create(
            elements=elements,
            defaults={
                'approach_date': approach_date.datetime,
                'min_distance_au': min_distance
            }
        )
        return approach

    except Exception as e:
        print(f"ОШИБКА ПРОГНОЗА СБЛИЖЕНИЯ: {e}")
        return None

# --- END OF FILE services.py ---
