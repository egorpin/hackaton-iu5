# orbit_calculator/serializers.py

from .models import Comet, Observation, OrbitalElements, CloseApproach
from rest_framework import serializers
from astropy.coordinates import Angle
import astropy.units as u
# --- Вложенные сериализаторы (для чтения) ---

class OrbitalElementsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrbitalElements
        fields = '__all__' # Включает все 6 элементов и метаданные

class CloseApproachSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloseApproach
        fields = '__all__' # Дата и дистанция сближения

COORD_INPUT_FIELDS = [
    'raHours', 'raMinutes', 'raSeconds',
    'decDegrees', 'decMinutes', 'decSeconds', 'decSign'
]

class ObservationSerializer(serializers.ModelSerializer):
    # ❗️ НОВЫЕ ПОЛЯ: Принимаем RA и Dec в строковом формате H:M:S и D:M:S
    ra_hms_str = serializers.CharField(write_only=True, required=False, help_text="Прямое восхождение в формате ЧЧ:ММ:СС")
    dec_dms_str = serializers.CharField(write_only=True, required=False, help_text="Склонение в формате [+/-]ДД:ММ:СС")

    class Meta:
        model = Observation
        # Включаем новые строковые поля для записи, сохраняя основные поля для чтения
        fields = (
            'id', 'observation_time', 'photo',
            'ra_deg', 'dec_deg',
            'ra_hms_str', 'dec_dms_str' # Вспомогательные поля для записи
        )
        # ra_deg и dec_deg по-прежнему только для чтения, они заполняются в validate
        read_only_fields = ('id', 'ra_deg', 'dec_deg')

    def validate(self, data):
        """Конвертируем H:M:S и D:M:S строки в градусы перед сохранением."""

        ra_hms_str = data.get('ra_hms_str')
        dec_dms_str = data.get('dec_dms_str')

        # 1. RA: Конвертация H:M:S в градусы (ra_deg)
        if ra_hms_str:
            # Преобразуем формат, подходящий для Angle: hh:mm:ss -> hhmmss.s
            try:
                # Astropy Angle умеет парсить формат 'hh:mm:ss'
                ra_angle = Angle(ra_hms_str, unit=u.hour)
                data['ra_deg'] = ra_angle.deg
            except Exception:
                raise serializers.ValidationError({"ra_hms_str": "Некорректный формат Прямого Восхождения. Ожидается ЧЧ:ММ:СС."})

        # 2. DEC: Конвертация [sign]D:M:S в градусы (dec_deg)
        if dec_dms_str:
            # Преобразуем формат, подходящий для Angle: [sign]dd:mm:ss -> [sign]ddmmss.s
            try:
                # Astropy Angle умеет парсить формат '[+/-]dd:mm:ss'
                dec_angle = Angle(dec_dms_str, unit=u.deg)
                data['dec_deg'] = dec_angle.deg
            except Exception:
                raise serializers.ValidationError({"dec_dms_str": "Некорректный формат Склонения. Ожидается [+/-]ДД:ММ:СС."})

        # Проверка, что ra_deg и dec_deg установлены (если ввод был)
        if ('ra_hms_str' in data and 'ra_deg' not in data) or \
           ('dec_dms_str' in data and 'dec_deg' not in data):
             # Эта ошибка должна быть поймана в try/except выше, но как страховка:
             raise serializers.ValidationError("Ошибка парсинга координат. Проверьте форматы.")

        return data

    def create(self, validated_data):
        # Здесь будет ошибка, если ra_deg или dec_deg не были установлены в validate
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

# --- Основные сериализаторы ---

class CometDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра кометы (GET /comets/<id>/)"""
    observations = ObservationSerializer(many=True, read_only=True)

    # Встраиваем рассчитанные элементы и прогноз
    elements = OrbitalElementsSerializer(read_only=True)
    close_approach = serializers.SerializerMethodField()

    class Meta:
        model = Comet
        fields = ('id', 'name', 'created_at', 'observations', 'elements', 'close_approach')

    def get_close_approach(self, obj):
        """Получение последнего прогноза сближения через связанные модели"""
        try:
            # Предполагаем, что у каждой орбиты есть один прогноз сближения
            approach = obj.elements.approach_prediction
            return CloseApproachSerializer(approach).data
        except CloseApproach.DoesNotExist:
            return None

# --- Сериализатор для записи (POST) ---

class CometCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания кометы и ее наблюдений (POST /calculate/)"""
    # Этот сериализатор используется для приема входных данных
    observations = ObservationSerializer(many=True)

    class Meta:
        model = Comet
        fields = ('name', 'observations')

    def _clean_validated_data(self, validated_data):
        """Helper function to remove temporary input fields."""
        validated_data.pop('ra_hms_str', None)
        validated_data.pop('dec_dms_str', None)
        return validated_data

    def create(self, validated_data):
        observations_data = validated_data.pop('observations')
        comet = Comet.objects.create(**validated_data)
        for obs_data in observations_data:
            # Привязываем каждое наблюдение к созданной комете
            Observation.objects.create(comet=comet, **self._clean_validated_data(obs_data))
        return comet
