from rest_framework import viewsets, permissions, status, mixins
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


@extend_schema_view(
    list=extend_schema(tags=['Notifications']),
    retrieve=extend_schema(tags=['Notifications']),
)
class NotificationViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_read', 'notification_type']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @extend_schema(tags=['Notifications'], request=None)
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({"marked_read": updated})

    @extend_schema(tags=['Notifications'], request=None)
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notif).data)

    @extend_schema(tags=['Notifications'])
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})


@extend_schema(tags=['Notifications'])
class NotificationPreferenceView(APIView):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preference, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(preference).data)

    def patch(self, request):
        preference, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
