from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkContractViewSet, BidViewSet, ContractAssignmentViewSet

router = DefaultRouter()
router.register(r'contracts', WorkContractViewSet, basename='contract')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'assignments', ContractAssignmentViewSet, basename='assignment')

urlpatterns = [
    path('', include(router.urls)),
]
