from rest_framework.routers import DefaultRouter

from .views import AmbulanceRequestViewSet

router = DefaultRouter()
router.register('requests', AmbulanceRequestViewSet, basename='ambulance-request')

urlpatterns = router.urls
