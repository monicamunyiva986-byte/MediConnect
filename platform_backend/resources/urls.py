from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ResourceCategoryViewSet, ResourceTypeViewSet,
    HospitalResourceViewSet, BloodStockViewSet, OxygenSupplyViewSet,
)

router = DefaultRouter()
router.register(r'categories', ResourceCategoryViewSet, basename='resource-category')
router.register(r'types', ResourceTypeViewSet, basename='resource-type')
router.register(r'stocks', HospitalResourceViewSet, basename='hospital-resource')
router.register(r'blood', BloodStockViewSet, basename='blood-stock')
router.register(r'oxygen', OxygenSupplyViewSet, basename='oxygen-supply')

urlpatterns = [
    path('', include(router.urls)),
]
