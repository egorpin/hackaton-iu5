from django.db import models
from astropy.coordinates import Angle
from django.core.validators import MinValueValidator

class Comet(models.Model):
    """Модель кометы (или серии наблюдений)."""
    name = models.CharField(max_length=100, default='Неизвестная комета')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Observation(models.Model):
    """Модель одного астрономического наблюдения."""
    comet = models.ForeignKey(Comet, on_delete=models.CASCADE, related_name='observations')

    # Время наблюдения (используется для TDB)
    observation_time = models.DateTimeField(
        help_text="Время наблюдения (UTC)"
    )

    # Прямое восхождение (Right Ascension)
    # Храним в виде строки для простоты ввода/вывода,
    # но можно хранить в секундах или радианах.
    ra_hms = models.CharField(
        max_length=15,
        help_text="Прямое восхождение (чч:мм:сс.сс)"
    )

    # Склонение (Declination)
    dec_dms = models.CharField(
        max_length=15,
        help_text="Склонение (+/-дд:мм:сс.с)"
    )

    # Дополнительные поля для улучшения (например, изображение)
    photo = models.ImageField(
        upload_to='comet_photos/',
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Наблюдение {self.id} для {self.comet.name} @ {self.observation_time}"

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
    """Модель для хранения прогноза минимального сближения с Землей."""
    orbital_elements = models.ForeignKey(
        OrbitalElements,
        on_delete=models.CASCADE,
        related_name='approaches'
    )

    approach_date = models.DateTimeField(
        help_text="Дата минимального сближения"
    )

    min_distance_au = models.FloatField(
        help_text="Минимальное расстояние (а.е.)"
    )

    def __str__(self):
        return f"Сближение {self.orbital_elements.comet.name} @ {self.approach_date.date()}"
