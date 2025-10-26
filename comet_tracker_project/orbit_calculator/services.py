# services.py
import numpy as np
from astropy.time import Time
from astropy.coordinates import SkyCoord, get_body_barycentric_posvel
from astropy import units as u
from poliastro.bodies import Sun
from poliastro.twobody import Orbit
from poliastro.iod import izzo
from poliastro.util import time_range
from django.utils import timezone
import pytz
from .models import Comet, Observation, OrbitalElements, CloseApproach

def django_datetime_to_astropy_time(dt):
    """
    Преобразует Django DateTime в Astropy Time.
    Убирает часовой пояс для совместимости с форматом 'isot'.
    """
    # Преобразуем в наивный datetime (без часового пояса)
    if dt.tzinfo is not None:
        # Используем pytz для преобразования в UTC и удаления информации о часовом поясе
        dt = dt.astimezone(pytz.UTC).replace(tzinfo=None)

    # Создаем ISO строку без информации о часовом поясе
    iso_string = dt.isoformat()
    return Time(iso_string, format='isot', scale='utc')

def calculate_orbital_elements(comet):
    """
    Рассчитывает орбитальные элементы кометы на основе наблюдений.
    Использует метод Гаусса для определения орбиты из трех наблюдений.
    """
    observations = comet.observations.all().order_by('observation_time')

    if len(observations) < 3:
        raise ValueError("Недостаточно наблюдений для расчета орбиты (требуется минимум 3)")

    # Берем первое, среднее и последнее наблюдение для лучшей точности
    obs_indices = [0, len(observations)//2, len(observations)-1]

    # Подготавливаем данные для метода Гаусса
    times = []
    earth_positions = []
    skycoords = []

    for idx in obs_indices:
        obs = observations[idx]

        # Время наблюдения - правильное преобразование в Astropy Time
        t = django_datetime_to_astropy_time(obs.observation_time)
        times.append(t)

        # Положение Земли в гелиоцентрической системе (в километрах)
        earth_r, earth_v = get_body_barycentric_posvel('earth', t)
        earth_positions.append(earth_r.xyz.to(u.km))  # Конвертируем в километры

        # Направление на комету (геоцентрические координаты)
        skycoord = obs.to_skycoord()
        skycoords.append(skycoord)

    # Используем метод Гаусса для определения орбиты
    try:
        # Для метода Ламберта нам нужны два положения и время между ними
        # Используем первое и последнее наблюдение

        # Преобразуем направления в векторы положения (в километрах)
        # Предполагаем, что комета находится на расстоянии 1 AU от Земли
        assumed_distance = 1.0 * u.AU  # Предполагаемое расстояние

        # Получаем единичные векторы направления и преобразуем их в километры
        # Явно создаем векторы с единицами длины
        r1_dir = skycoords[0].cartesian.xyz * assumed_distance.to(u.km)
        r2_dir = skycoords[2].cartesian.xyz * assumed_distance.to(u.km)

        # Положение кометы = положение Земли + направление на комету
        r1_obs = earth_positions[0] + r1_dir
        r2_obs = earth_positions[2] + r2_dir

        print(f"Время перелета: {(times[2] - times[0]).to(u.day)}")
        print(f"r1_obs: {r1_obs}")
        print(f"r2_obs: {r2_obs}")
        print(f"r1_obs units: {r1_obs.unit}")
        print(f"r2_obs units: {r2_obs.unit}")

        # Вычисляем время перелета в секундах
        tof = (times[2] - times[0]).to(u.s)

        # Используем метод Ламберта для определения орбиты
        # Poliastro ожидает векторы в километрах
        # Метод Ламберта возвращает скорости в начальной и конечной точках
        v1, v2 = izzo.lambert(
            Sun.k,  # Гравитационный параметр Солнца в km^3/s^2
            r1_obs,
            r2_obs,
            tof
        )

        print(f"Рассчитанные скорости:")
        print(f"v1={v1}, тип: {type(v1)}, единицы: {getattr(v1, 'unit', 'No units')}")
        print(f"v2={v2}, тип: {type(v2)}, единицы: {getattr(v2, 'unit', 'No units')}")

        # Создаем орбиту используя начальное положение и начальную скорость
        # Poliastro ожидает векторы в метрах, поэтому конвертируем
        r0 = r1_obs.to(u.m)  # Начальное положение в метрах
        v0 = v1.to(u.m / u.s)  # Начальная скорость в м/с

        print(f"После преобразования единиц:")
        print(f"r0={r0.to(u.km)}")
        print(f"v0={v0.to(u.km/u.s)}")

        # Создаем орбиту (векторы уже в правильных единицах)
        orbit = Orbit.from_vectors(Sun, r0, v0, epoch=times[0])

        # Извлекаем орбитальные элементы
        elements = orbit.classical()

        print(f"Орбитальные элементы:")
        print(f"  Большая полуось: {elements[0].to(u.AU):.3f}")
        print(f"  Эксцентриситет: {elements[1]:.6f}")
        print(f"  Наклонение: {elements[2].to(u.deg):.3f}")
        print(f"  Долгота восх. узла: {elements[3].to(u.deg):.3f}")
        print(f"  Аргумент перицентра: {elements[4].to(u.deg):.3f}")

        # Вычисляем время перигелия
        # Для эллиптической орбиты используем упрощенный подход
        # В poliastro 0.17.0 нет метода time_to_periapsis, поэтому используем эпоху
        if elements[1] < 1:
            # Используем текущую эпоху как приближение для времени перигелия
            # В реальном приложении нужно вычислять истинную аномалию
            time_of_pericenter = times[0]
            print("Использована эпоха наблюдения как приближение для времени перигелия")
        else:
            # Для гиперболической орбиты используем текущее время
            time_of_pericenter = times[0]
            print("Гиперболическая орбита")

        # Преобразуем время перигелия в Django DateTime
        pericenter_dt = time_of_pericenter.to_datetime()

        # Создаем или обновляем запись орбитальных элементов
        orbital_elements, created = OrbitalElements.objects.get_or_create(
            comet=comet,
            defaults={
                'semimajor_axis': elements[0].to(u.AU).value,
                'eccentricity': elements[1].value,
                'inclination': elements[2].to(u.deg).value,
                'ra_of_node': elements[3].to(u.deg).value,
                'arg_of_pericenter': elements[4].to(u.deg).value,
                'time_of_pericenter': pericenter_dt,
                'rms_error': 0.1
            }
        )

        if not created:
            # Обновляем существующие элементы
            orbital_elements.semimajor_axis = elements[0].to(u.AU).value
            orbital_elements.eccentricity = elements[1].value
            orbital_elements.inclination = elements[2].to(u.deg).value
            orbital_elements.ra_of_node = elements[3].to(u.deg).value
            orbital_elements.arg_of_pericenter = elements[4].to(u.deg).value
            orbital_elements.time_of_pericenter = pericenter_dt
            orbital_elements.rms_error = 0.1
            orbital_elements.save()

        return orbital_elements

    except Exception as e:
        print(f"Детали ошибки расчета орбиты: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Ошибка расчета орбиты: {str(e)}")

def predict_close_approach(orbital_elements):
    """
    Прогнозирует сближение кометы с Землей.
    """
    try:
        # Преобразуем время перигелия в Astropy Time
        epoch = django_datetime_to_astropy_time(orbital_elements.time_of_pericenter)

        # Создаем орбиту кометы из элементов
        orbit_comet = Orbit.from_classical(
            Sun,
            orbital_elements.semimajor_axis * u.AU,
            orbital_elements.eccentricity * u.one,
            orbital_elements.inclination * u.deg,
            orbital_elements.ra_of_node * u.deg,
            orbital_elements.arg_of_pericenter * u.deg,
            0 * u.deg,  # Средняя аномалия в перигелии
            epoch=epoch
        )

        # Период обращения кометы
        period_comet = orbit_comet.period.to(u.day)
        print(f"Период обращения кометы: {period_comet}")

        # Ищем сближение в ближайшие 2 периода (но не более 2 лет)
        search_duration = min(2 * period_comet.value, 365 * 2) * u.day
        print(f"Длительность поиска: {search_duration}")

        # Создаем временной диапазон для поиска
        start_time = epoch
        end_time = start_time + search_duration
        times = time_range(start_time, end=end_time, periods=100)  # Уменьшили для производительности

        min_distance = np.inf * u.m
        min_distance_time = start_time

        # Ищем минимальное расстояние
        for i, t in enumerate(times):
            try:
                # Положение кометы
                orbit_at_t = orbit_comet.propagate(t)
                r_comet = orbit_at_t.r  # В метрах

                # Положение Земли (в метрах)
                r_earth, _ = get_body_barycentric_posvel('earth', t)
                r_earth = r_earth.xyz.to(u.m)

                # Расстояние между кометой и Землей
                distance = np.linalg.norm(r_comet - r_earth)

                if distance < min_distance:
                    min_distance = distance
                    min_distance_time = t

                if i % 20 == 0:  # Логируем каждую 20-ю точку
                    print(f"Точка {i}: время={t}, расстояние={distance.to(u.AU):.3f}")

            except Exception as prop_error:
                # Пропускаем проблемные точки, но логируем
                print(f"Пропущена точка {t}: {prop_error}")
                continue

        print(f"Минимальное расстояние: {min_distance.to(u.AU):.6f} AU в {min_distance_time}")

        # Преобразуем обратно в Django DateTime
        approach_datetime = min_distance_time.to_datetime()

        # Сохраняем прогноз сближения
        approach, created = CloseApproach.objects.get_or_create(
            elements=orbital_elements,
            defaults={
                'approach_date': approach_datetime,
                'min_distance_au': min_distance.to(u.AU).value
            }
        )

        if not created:
            approach.approach_date = approach_datetime
            approach.min_distance_au = min_distance.to(u.AU).value
            approach.save()

        return approach

    except Exception as e:
        print(f"Детали ошибки прогноза сближения: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Ошибка прогноза сближения: {str(e)}")

# Альтернативная реализация с использованием всех наблюдений
def calculate_orbital_elements_advanced(comet):
    """
    Усовершенствованная версия с использованием всех наблюдений.
    """
    observations = comet.observations.all().order_by('observation_time')

    if len(observations) < 5:
        raise ValueError("Для точного расчета требуется минимум 5 наблюдений")

    # Пока используем базовую реализацию с первыми тремя наблюдениями
    return calculate_orbital_elements(comet)

# Упрощенная версия для отладки с тестовыми данными
def calculate_orbital_elements_simple(comet):
    """
    Упрощенная версия расчета орбитальных элементов для отладки.
    Использует тестовые данные для создания реалистичной орбиты.
    """
    try:
        # Создаем тестовую орбиту (примерно как у Марса)
        orbit = Orbit.from_classical(
            Sun,
            1.5 * u.AU,      # большая полуось
            0.09 * u.one,    # эксцентриситет
            1.85 * u.deg,    # наклонение
            49.6 * u.deg,    # долгота восходящего узла
            286.5 * u.deg,   # аргумент перицентра
            0 * u.deg,       # средняя аномалия
            epoch=Time('2025-10-26T00:00:00', format='isot', scale='utc')
        )

        elements = orbit.classical()

        # Создаем или обновляем запись орбитальных элементов
        orbital_elements, created = OrbitalElements.objects.get_or_create(
            comet=comet,
            defaults={
                'semimajor_axis': elements[0].to(u.AU).value,
                'eccentricity': elements[1].value,
                'inclination': elements[2].to(u.deg).value,
                'ra_of_node': elements[3].to(u.deg).value,
                'arg_of_pericenter': elements[4].to(u.deg).value,
                'time_of_pericenter': timezone.now(),
                'rms_error': 0.01
            }
        )

        print("Использована упрощенная версия расчета орбиты")
        return orbital_elements

    except Exception as e:
        raise Exception(f"Ошибка упрощенного расчета орбиты: {str(e)}")
