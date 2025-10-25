# --- START OF FILE serializers.py ---

# orbit_calculator/serializers.py

from .models import Comet, Observation, OrbitalElements, CloseApproach
from rest_framework import serializers
from astropy.coordinates import Angle
import astropy.units as u

# --- Вложенные сериализаторы (для чтения) ---

class OrbitalElementsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrbitalElements
        fields = '__all__'

class CloseApproachSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloseApproach
        fields = '__all__'

COORD_INPUT_FIELDS = [
    'raHours', 'raMinutes', 'raSeconds',
    'decDegrees', 'decMinutes', 'decSeconds', 'decSign'
]

class ObservationSerializer(serializers.ModelSerializer):
    # Эти поля остаются как есть
    ra_hms_str = serializers.CharField(write_only=True, required=False, help_text="Прямое восхождение в формате ЧЧ:ММ:СС")
    dec_dms_str = serializers.CharField(write_only=True, required=False, help_text="Склонение в формате [+/-]ДД:ММ:СС")

    class Meta:
        model = Observation
        fields = (
            'id', 'observation_time', 'photo',
            'ra_deg', 'dec_deg',
            'ra_hms_str', 'dec_dms_str'
        )
        read_only_fields = ('id', 'ra_deg', 'dec_deg')

    def validate(self, data):
        """Конвертируем H:M:S и D:M:S строки в градусы перед сохранением."""
        # Эта функция остается без изменений, она работает правильно.
        ra_hms_str = data.get('ra_hms_str')
        dec_dms_str = data.get('dec_dms_str')

        if ra_hms_str:
            try:
                ra_angle = Angle(ra_hms_str, unit=u.hour)
                data['ra_deg'] = ra_angle.deg
            except Exception:
                raise serializers.ValidationError({"ra_hms_str": "Некорректный формат Прямого Восхождения. Ожидается ЧЧ:ММ:СС."})

        if dec_dms_str:
            try:
                dec_angle = Angle(dec_dms_str, unit=u.deg)
                data['dec_deg'] = dec_angle.deg
            except Exception:
                raise serializers.ValidationError({"dec_dms_str": "Некорректный формат Склонения. Ожидается [+/-]ДД:ММ:СС."})

        if ('ra_hms_str' in data and 'ra_deg' not in data) or \
           ('dec_dms_str' in data and 'dec_deg' not in data):
             raise serializers.ValidationError("Ошибка парсинга координат. Проверьте форматы.")

        return data

    # --- ВОТ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ДОБАВЛЯЕМ ЭТОТ МЕТОД ---
    def create(self, validated_data):
        """
        Переопределяем метод создания, чтобы удалить временные поля перед сохранением.
        """
        # Удаляем строковые поля, так как их нет в модели Observation.
        # Второй аргумент `None` нужен для того, чтобы не было ошибки, если поле отсутствует.
        validated_data.pop('ra_hms_str', None)
        validated_data.pop('dec_dms_str', None)

        # Создаем объект Observation, используя только те данные,
        # которые соответствуют полям модели.
        return Observation.objects.create(**validated_data)

# --- Основные сериализаторы ---

class CometDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра кометы (GET /comets/<id>/)"""
    observations = ObservationSerializer(many=True, read_only=True)
    elements = OrbitalElementsSerializer(read_only=True)
    close_approach = serializers.SerializerMethodField()

    class Meta:
        model = Comet
        fields = ('id', 'name', 'created_at', 'observations', 'elements', 'close_approach')

    def get_close_approach(self, obj):
        try:
            approach = obj.elements.approach_prediction
            return CloseApproachSerializer(approach).data
        except (AttributeError, CloseApproach.DoesNotExist):
            return None

# --- Сериализаторы для записи (POST/PUT) ---

class CometCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания кометы и ее наблюдений (POST /calculate/)"""
    observations = ObservationSerializer(many=True)

    class Meta:
        model = Comet
        fields = ('name', 'observations')

    def create(self, validated_data):
        observations_data = validated_data.pop('observations')
        comet = Comet.objects.create(**validated_data)
        for obs_data in observations_data:
            Observation.objects.create(comet=comet, **obs_data)
        return comet

# --- НОВЫЙ СЕРИАЛИЗАТОР ---
class CometSimpleSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания/обновления кометы ТОЛЬКО по имени.
    Используется для валидации входных данных.
    """
    class Meta:
        model = Comet
        # Указываем только те поля, которые мы отправляем с фронтенда
        fields = ('name',)
