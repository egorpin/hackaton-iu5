# orbit_calculator/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CometViewSet, OrbitCalculationView, AddObservationView

# Создание роутера для ViewSet (для стандартных GET)
router = DefaultRouter()
router.register(r'comets', CometViewSet)

urlpatterns = [
    # Стандартные маршруты: GET /comets/, GET /comets/<id>/
    path('', include(router.urls)),

    # 1. Основной эндпоинт для запуска расчетов
    path('comets/calculate/', OrbitCalculationView.as_view(), name='calculate_orbit'),

    # 2. Эндпоинт для добавления новых наблюдений и пересчета
    path('comets/<int:comet_pk>/observations/', AddObservationView.as_view(), name='add_observation'),
]

# Не забудьте обновить главный urls.py:
# path('api/v1/', include('orbit_calculator.urls')),
