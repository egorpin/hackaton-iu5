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

# --- НОВЫЙ ИМПОРТ ДЛЯ ДЕТАЛЬНОЙ ОТЛАДКИ ---
import traceback

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

    def create(self, request, *args, **kwargs):
        """
        Переопределяем метод создания, чтобы вернуть детальный ответ.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
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
            elements = calculate_orbital_elements(comet)
            if elements:
                predict_close_approach(elements)

            detail_serializer = CometDetailSerializer(comet)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            comet.delete()
            # 1. Выводим полную информацию об ошибке в консоль сервера
            print("="*60)
            print(f"!!! КРИТИЧЕСКАЯ ОШИБКА РАСЧЕТА ОРБИТЫ ПРИ СОЗДАНИИ !!!")
            traceback.print_exc()
            print(f"!!! ТЕКСТ ИСКЛЮЧЕНИЯ: {e} !!!")
            print("="*60)
            return Response(
                {"error": f"Ошибка расчета орбиты: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AddObservationView(APIView):
    """
    POST /api/comets/<comet_pk>/observations/
    Добавляет наблюдение к существующей комете и запускает ПЕРЕСЧЕТ,
    если наблюдений достаточно.
    """
    def post(self, request, comet_pk, *args, **kwargs):
        comet = get_object_or_404(Comet, pk=comet_pk)
        serializer = ObservationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(comet=comet)

        # Логика пересчета, если наблюдений достаточно
        if comet.observations.count() >= 3:
            try:
                elements = calculate_orbital_elements(comet)
                if elements:
                    predict_close_approach(elements)

            except Exception as e:
                # --- ЛОГИКА ОБРАБОТКИ ОШИБКИ ---
                print("="*60)
                print(f"!!! КРИТИЧЕСКАЯ ОШИБКА РАСЧЕТА ОРБИТЫ ДЛЯ КОМЕТЫ ID={comet.id} !!!")
                traceback.print_exc()
                print(f"!!! ТЕКСТ ИСКЛЮЧЕНИЯ: {e} !!!")
                print("="*60)

                detail_serializer = CometDetailSerializer(comet)
                response_data = detail_serializer.data
                response_data['calculation_warning'] = f"Наблюдение добавлено, но пересчет орбиты не удался. См. консоль сервера для деталей."
                return Response(response_data, status=status.HTTP_200_OK)

        # Если расчет прошел успешно или наблюдений недостаточно
        detail_serializer = CometDetailSerializer(comet)
        return Response(detail_serializer.data, status=status.HTTP_200_OK)


class RecalculateOrbitView(APIView):
    """
    POST /api/comets/<comet_pk>/recalculate/
    Принудительно запускает пересчет орбиты по текущим наблюдениям.
    """
    def post(self, request, comet_pk, *args, **kwargs):
        comet = get_object_or_404(Comet, pk=comet_pk)

        # 1. Проверка минимального количества наблюдений
        if comet.observations.count() < 3:
            detail_serializer = CometDetailSerializer(comet)
            response_data = detail_serializer.data
            response_data['error'] = "Для пересчета орбиты требуется минимум 3 наблюдения."
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # 2. Запуск расчета
        try:
            elements = calculate_orbital_elements(comet)
            if elements:
                predict_close_approach(elements)

            # 3. Успешный ответ
            detail_serializer = CometDetailSerializer(comet)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            # 4. Обработка ошибки
            print("="*60)
            print(f"!!! КРИТИЧЕСКАЯ ОШИБКА ПРИНУДИТЕЛЬНОГО ПЕРЕСЧЕТА ОРБИТЫ ДЛЯ КОМЕТЫ ID={comet.id} !!!")
            traceback.print_exc()
            print(f"!!! ТЕКСТ ИСКЛЮЧЕНИЯ: {e} !!!")
            print("="*60)

            detail_serializer = CometDetailSerializer(comet)
            response_data = detail_serializer.data
            response_data['calculation_error'] = f"Принудительный пересчет орбиты не удался. См. консоль сервера для деталей."
            return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- END OF FILE views.py ---
