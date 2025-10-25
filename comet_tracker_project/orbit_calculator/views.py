from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Comet, Observation
from .serializers import (
    CometDetailSerializer, CometCreateSerializer, ObservationSerializer
)
from .services import calculate_orbital_elements, predict_close_approach

class CometViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Предоставляет список всех комет и детали по ID.
    (GET /comets/, GET /comets/<id>/)
    """
    queryset = Comet.objects.all()
    serializer_class = CometDetailSerializer

class OrbitCalculationView(APIView):
    """
    POST /api/v1/comets/calculate/
    Принимает имя и 5+ наблюдений, запускает полный расчет.
    """
    def post(self, request, *args, **kwargs):
        serializer = CometCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        comet = serializer.save()

        if comet.observations.count() < 5:
            comet.delete()
            return Response(
                {"error": "Требуется минимум 5 наблюдений для расчета орбиты."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. Расчет элементов орбиты
            calculate_orbital_elements(comet)
            # 2. Прогноз сближения
            predict_close_approach(comet.elements)

            # Возвращаем данные только что созданной кометы с результатами
            detail_serializer = CometDetailSerializer(comet)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            comet.delete() # Откат при ошибке
            return Response(
                {"error": f"Ошибка расчета орбиты: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AddObservationView(APIView):
    """
    POST /api/v1/comets/<comet_pk>/observations/
    Добавляет наблюдение к существующей комете и запускает ПЕРЕСЧЕТ.
    """
    def post(self, request, comet_pk, *args, **kwargs):
        comet = get_object_or_404(Comet, pk=comet_pk)

        # 1. Добавление нового наблюдения
        serializer = ObservationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_obs = serializer.save(comet=comet) # Привязываем к комете

        try:
            # 2. Пересчет орбитальных элементов с учетом нового наблюдения
            elements = calculate_orbital_elements(comet)

            # 3. Пересчет прогноза сближения
            predict_close_approach(elements)

            # Возвращаем обновленные данные кометы
            detail_serializer = CometDetailSerializer(comet)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            # Если пересчет не удался, можно оставить наблюдение, но
            # сообщить об ошибке пересчета.
            return Response(
                {"error": f"Наблюдение добавлено, но пересчет орбиты не удался: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
