from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationPreferenceView
from .views import NotificationViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('', include(router.urls)),
]
