from rest_framework import serializers
from .models import Comet, Observation, OrbitalElements, CloseApproach

class ObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Observation
        exclude = ('comet',)
        read_only_fields = ('id',)

class CometSerializer(serializers.ModelSerializer):
    # Позволяет принимать список наблюдений при создании кометы
    observations = ObservationSerializer(many=True)

    class Meta:
        model = Comet
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

    def create(self, validated_data):
        observations_data = validated_data.pop('observations')
        comet = Comet.objects.create(**validated_data)
        for obs_data in observations_data:
            Observation.objects.create(comet=comet, **obs_data)
        return comet

class OrbitalElementsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrbitalElements
        exclude = ('comet',)

class CloseApproachSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloseApproach
        exclude = ('orbital_elements',)
