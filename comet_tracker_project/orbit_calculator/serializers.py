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
    # 💡 Поля для ввода (не хранятся в БД)
    raHours = serializers.IntegerField(write_only=True, min_value=0, max_value=24, required=False)
    raMinutes = serializers.IntegerField(write_only=True, min_value=0, max_value=60, required=False)
    raSeconds = serializers.FloatField(write_only=True, min_value=0.0, max_value=60.0, required=False)

    decDegrees = serializers.IntegerField(write_only=True, min_value=0, max_value=90, required=False)
    decMinutes = serializers.IntegerField(write_only=True, min_value=0, max_value=60, required=False)
    decSeconds = serializers.FloatField(write_only=True, min_value=0.0, max_value=60.0, required=False)
    decSign = serializers.CharField(write_only=True, max_length=1, required=False) # '+' или '-'

    class Meta:
        model = Observation
        # Включаем все вспомогательные поля и основные поля для чтения
        fields = (
            'id',
            'observation_time',
            'photo',
            'ra_deg',
            'dec_deg',
            # Поля для записи (Write-only)
            'raHours', 'raMinutes', 'raSeconds',
            'decDegrees', 'decMinutes', 'decSeconds', 'decSign'
        )
        read_only_fields = ('id', 'ra_deg', 'dec_deg')

    def validate(self, data):
        """Конвертируем H/M/S и D/M/S в градусы перед сохранением."""

        # 1. RA: Конвертация Hours/Minutes/Seconds в градусы (ra_deg)
        if all(k in data for k in ['raHours', 'raMinutes', 'raSeconds']):
            ra_str = f"{data['raHours']}h{data['raMinutes']}m{data['raSeconds']}s"
            try:
                ra_angle = Angle(ra_str)
                data['ra_deg'] = ra_angle.deg
            except Exception:
                raise serializers.ValidationError("Некорректный формат Прямого Восхождения (RA).")

        # 2. DEC: Конвертация Degrees/Minutes/Seconds в градусы (dec_deg)
        if all(k in data for k in ['decDegrees', 'decMinutes', 'decSeconds', 'decSign']):
            dec_str = f"{data['decSign']}{data['decDegrees']}d{data['decMinutes']}m{data['decSeconds']}s"
            try:
                dec_angle = Angle(dec_str)
                data['dec_deg'] = dec_angle.deg
            except Exception:
                raise serializers.ValidationError("Некорректный формат Склонения (Dec).")

        # Проверка, что ra_deg и dec_deg установлены (либо через H/M/S, либо уже есть)
        if 'ra_deg' not in data or 'dec_deg' not in data:
             raise serializers.ValidationError("Необходимо предоставить полные данные координат.")

        return data

    def create(self, validated_data):
        # ❗️ FIX: Clean data before creation
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # ❗️ FIX: Clean data before update
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
        for k in COORD_INPUT_FIELDS:
            # Pop the temporary field if it exists
            validated_data.pop(k, None)
        return validated_data

    def create(self, validated_data):
        observations_data = validated_data.pop('observations')
        comet = Comet.objects.create(**validated_data)
        for obs_data in observations_data:
            # Привязываем каждое наблюдение к созданной комете
            Observation.objects.create(comet=comet, **self._clean_validated_data(obs_data))
        return comet
