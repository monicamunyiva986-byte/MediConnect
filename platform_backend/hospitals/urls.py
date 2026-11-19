from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HospitalViewSet, DepartmentViewSet, HospitalStaffViewSet

router = DefaultRouter()
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'staff', HospitalStaffViewSet, basename='hospital-staff')

urlpatterns = [
    path('', include(router.urls)),
]
