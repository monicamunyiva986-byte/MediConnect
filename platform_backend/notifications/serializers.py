from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'notification_type', 'title', 'message',
            'data', 'is_read', 'read_at', 'created_at',
        )
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = (
            'email_enabled', 'push_enabled', 'sms_enabled',
            'notify_new_contracts', 'notify_bid_updates',
            'notify_resource_alerts', 'notify_assignment_reminders',
        )
