from django.contrib import admin
from .models import Comet, Observation, OrbitalElements, CloseApproach

# ----------------------------------------------------------------------
# Вспомогательные классы для отображения вложенных данных (Inlines)
# ----------------------------------------------------------------------

class ObservationInline(admin.TabularInline):
    """Отображает наблюдения внутри страницы кометы."""
    model = Observation
    extra = 1

    # Поля для ввода (используем ra_deg/dec_deg для ввода/редактирования,
    # так как Inline не поддерживает сложную логику 'write_only' из Serializer)
    fields = (
        'observation_time',
        'ra_deg',
        'dec_deg',
        'photo',
        'ra_hms_display', # Отображение H/M/S
        'dec_dms_display' # Отображение D/M/S
    )

    # Отображаемые поля (только для чтения)
    readonly_fields = ('photo', 'ra_hms_display', 'dec_dms_display')

    # 💡 Пользовательские методы для отображения координат в удобном формате
    @admin.display(description='RA (ЧЧ:ММ:СС)')
    def ra_hms_display(self, obj):
        if obj.ra_deg is not None:
            parts = obj.ra_hms_parts
            return f"{parts['raHours']:02d}h {parts['raMinutes']:02d}m {parts['raSeconds']:.3f}s"
        return "N/A"

    @admin.display(description='DEC (ДД:ММ:СС)')
    def dec_dms_display(self, obj):
        if obj.dec_deg is not None:
            parts = obj.dec_dms_parts
            return f"{parts['decSign']}{parts['decDegrees']:02d}° {parts['decMinutes']:02d}' {parts['decSeconds']:.2f}\""
        return "N/A"

class OrbitalElementsInline(admin.StackedInline):
    """Отображает элементы орбиты внутри страницы кометы."""
    model = OrbitalElements
    can_delete = False
    verbose_name = "Рассчитанные Элементы Орбиты"

    # ❗️ НОВОЕ: Исключите 'calculation_date' из полей, которые будут в форме.
    # Если вы используете 'fieldsets', нужно убедиться, что оно там отображается как 'readonly'.
    # В inlines удобнее использовать 'exclude' И 'readonly_fields'.

    exclude = ('calculation_date',) # Исключаем его из редактируемых полей формы

    # Поля для отображения
    fieldsets = (
        (None, {
            'fields': (('semimajor_axis', 'eccentricity'),
                       ('inclination', 'ra_of_node', 'arg_of_pericenter'),
                       'time_of_pericenter'),
        }),
        ('Метаданные расчета', {
            'fields': ('calculation_date', 'rms_error'), # Здесь оно для отображения
            'classes': ('collapse',),
        })
    )

    # ❗️ НОВОЕ: Добавляем 'calculation_date' в список полей только для чтения.
    # Это позволяет fieldsets отображать его.
    readonly_fields = ('calculation_date',)

class CloseApproachInline(admin.TabularInline):
    """Отображает прогноз сближения внутри страницы элементов орбиты."""
    model = CloseApproach
    can_delete = False
    max_num = 1
    fields = ('approach_date', 'min_distance_au')
    verbose_name = "Прогноз Сближения с Землей"


# ----------------------------------------------------------------------
# Основные классы Admin
# ----------------------------------------------------------------------

@admin.register(Comet)
class CometAdmin(admin.ModelAdmin):
    """Админ-панель для модели Кометы."""
    list_display = ('name', 'created_at', 'get_element_status', 'get_approach_distance')
    search_fields = ('name',)
    list_filter = ('created_at',)

    # Включаем inlines для отображения связанных данных
    inlines = [ObservationInline, OrbitalElementsInline]

    # Добавляем пользовательские методы для list_display
    @admin.display(description='Статус Орбиты')
    def get_element_status(self, obj):
        return "✅ Рассчитана" if hasattr(obj, 'elements') else "❌ Нет данных"

    @admin.display(description='Мин. Дистанция (а.е.)')
    def get_approach_distance(self, obj):
        try:
            return f"{obj.elements.approaches.latest('id').min_distance_au:.4f} а.е."
        except:
            return "N/A"

@admin.register(OrbitalElements)
class OrbitalElementsAdmin(admin.ModelAdmin):
    """Админ-панель для элементов орбиты."""
    list_display = ('comet', 'semimajor_axis', 'eccentricity', 'inclination', 'calculation_date')
    list_filter = ('calculation_date',)
    search_fields = ('comet__name',)

    # Включаем прогноз сближения как вложенный элемент
    inlines = [CloseApproachInline]

# Модели Observation и CloseApproach не регистрируем отдельно,
# так как они отображаются внутри Comet и OrbitalElements.

# Если вы хотите управлять Наблюдениями отдельно:
# @admin.register(Observation)
# class ObservationAdmin(admin.ModelAdmin):
#     list_display = ('comet', 'observation_time', 'ra_hms', 'dec_dms')
#     list_filter = ('observation_time', 'comet')
