from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import astropy.units as u
from astropy.coordinates import Angle, SkyCoord

class Comet(models.Model):
    """Модель кометы (или серии наблюдений)."""
    name = models.CharField(max_length=100, default='Неизвестная комета')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Observation(models.Model):
    comet = models.ForeignKey(Comet, on_delete=models.CASCADE, related_name='observations')
    observation_time = models.DateTimeField(
        help_text="Время наблюдения (UTC)"
    )

    # 💡 Основные поля для хранения (в градусах)
    ra_deg = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(360.0)],
        help_text="Прямое восхождение (RA) в градусах"
    )
    dec_deg = models.FloatField(
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
        help_text="Склонение (Dec) в градусах"
    )

    photo = models.ImageField(
        upload_to='comet_photos/',
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Наблюдение {self.id} для {self.comet.name} @ {self.observation_time}"

    # ==========================================================
    # 💡 Методы для преобразования в формат H/M/S и D/M/S
    # ==========================================================

    @property
    def ra_hms_parts(self):
        """Возвращает части RA (часы, минуты, секунды) из ra_deg."""
        hms = Angle(self.ra_deg * u.deg).to_string(unit=u.hour, sep=('h', 'm', 's')).split()
        return {
            'raHours': int(hms[0][:-1]),
            'raMinutes': int(hms[1][:-1]),
            'raSeconds': float(hms[2][:-1])
        }

    @property
    def dec_dms_parts(self):
        """Возвращает части Dec (знак, градусы, минуты, секунды) из dec_deg."""
        dms_str = Angle(self.dec_deg * u.deg).to_string(unit=u.deg, sep=('d', 'm', 's'), precision=1)
        sign = '+' if self.dec_deg >= 0 else '-'

        # Удаляем знак для парсинга
        dms_parts = dms_str.replace('+', '').replace('-', '').split()

        return {
            'decSign': sign,
            'decDegrees': int(dms_parts[0][:-1]),
            'decMinutes': int(dms_parts[1][:-1]),
            'decSeconds': float(dms_parts[2][:-1])
        }

    # 💡 Полезный метод для преобразования в формат Astropy SkyCoord
    def to_skycoord(self):
        """Возвращает объект SkyCoord из числовых полей."""
        return SkyCoord(
            ra=self.ra_deg * u.deg,
            dec=self.dec_deg * u.deg,
            frame='icrs'
        )

class OrbitalElements(models.Model):
    """Модель для хранения 6 элементов орбиты кометы."""
    comet = models.OneToOneField(Comet, on_delete=models.CASCADE, related_name='elements')

    # 6 Кеплеровых элементов
    # 1. Большая полуось (a)
    semimajor_axis = models.FloatField(
        help_text="Большая полуось (а.е.)"
    )
    # 2. Эксцентриситет (e)
    eccentricity = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Эксцентриситет (e)"
    )
    # 3. Наклонение (i)
    inclination = models.FloatField(
        help_text="Наклонение (град)"
    )
    # 4. Долгота восходящего узла (Ω)
    ra_of_node = models.FloatField(
        help_text="Долгота восходящего узла (град)"
    )
    # 5. Аргумент перицентра (ω)
    arg_of_pericenter = models.FloatField(
        help_text="Аргумент перицентра (град)"
    )
    # 6. Время прохождения перигелия (T0)
    time_of_pericenter = models.DateTimeField(
        help_text="Время прохождения перигелия (T0)"
    )

    # Параметры расчета
    calculation_date = models.DateTimeField(auto_now=True)
    rms_error = models.FloatField(
        null=True,
        blank=True,
        help_text="Среднеквадратичная ошибка подгонки"
    )

    def __str__(self):
        return f"Орбита {self.comet.name} ({self.calculation_date.date()})"

class CloseApproach(models.Model):
    """
    Прогноз сближения. Использует OneToOneField,
    гарантируя, что для данного набора элементов орбиты может быть только один прогноз.
    """
    # ❗️ ИЗМЕНЕНИЕ: Используем OneToOneField для уникальной связи
    elements = models.OneToOneField(
        OrbitalElements,
        on_delete=models.CASCADE,
        related_name='approach_prediction'
    )

    approach_date = models.DateTimeField(
        help_text="Дата и время минимального сближения"
    )
    min_distance_au = models.FloatField(
        help_text="Минимальное расстояние до Земли в а.е."
    )

    def __str__(self):
        return f"Сближение для орбиты {self.elements.id} ({self.approach_date.date()})"
