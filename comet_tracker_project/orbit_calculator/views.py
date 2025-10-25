# --- START OF FILE views.py ---

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Comet, Observation
from .serializers import (
    CometDetailSerializer, CometCreateSerializer, ObservationSerializer, CometSimpleSerializer
)
from .services import calculate_orbital_elements, predict_close_approach

# --- ИЗМЕНЕНИЕ: Заменяем ReadOnlyModelViewSet на ModelViewSet ---
class CometViewSet(viewsets.ModelViewSet):
    """
    Предоставляет полный CRUD для комет.
    (GET, POST /comets/, GET, PUT, PATCH, DELETE /comets/<id>/)
    """
    queryset = Comet.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        """
        Используем разные сериализаторы для разных действий.
        """
        if self.action in ['create', 'update', 'partial_update']:
            # Для валидации входных данных используем простой сериализатор
            return CometSimpleSerializer
        # Для отображения (список, детали) используем детальный
        return CometDetailSerializer

    # --- ДОБАВЬ ЭТОТ МЕТОД ---
    def create(self, request, *args, **kwargs):
        """
        Переопределяем метод создания, чтобы вернуть детальный ответ.
        """
        # 1. Валидируем входящие данные с помощью простого сериализатора
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2. Создаем объект кометы
        self.perform_create(serializer)

        # 3. Для ответа на фронтенд используем ДЕТАЛЬНЫЙ сериализатор,
        # чтобы фронтенд получил всю нужную информацию (id, пустые наблюдения и т.д.)
        instance = serializer.instance
        response_serializer = CometDetailSerializer(instance)

        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class OrbitCalculationView(APIView):
    """
    POST /api/comets/calculate/
    Принимает имя и 5+ наблюдений, запускает полный расчет.
    (Этот эндпоинт можно будет удалить в будущем, если вся логика переедет
    в CometViewSet и AddObservationView, но пока оставим для совместимости)
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
            calculate_orbital_elements(comet)
            predict_close_approach(comet.elements)
            detail_serializer = CometDetailSerializer(comet)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            comet.delete()
            return Response(
                {"error": f"Ошибка расчета орбиты: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AddObservationView(APIView):
    """
    POST /api/comets/<comet_pk>/observations/
    Добавляет наблюдение к существующей комете и запускает ПЕРЕСЧЕТ.
    """
    def post(self, request, comet_pk, *args, **kwargs):
        comet = get_object_or_404(Comet, pk=comet_pk)
        serializer = ObservationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(comet=comet)

        try:
            elements = calculate_orbital_elements(comet)
            predict_close_approach(elements)
            detail_serializer = CometDetailSerializer(comet)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Наблюдение добавлено, но пересчет орбиты не удался: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
# --- END OF FILE views.py ---
