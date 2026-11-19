from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        CONTRACT_NEW = 'CONTRACT_NEW', _('New contract matching your profile')
        BID_RECEIVED = 'BID_RECEIVED', _('New bid on your contract')
        BID_ACCEPTED = 'BID_ACCEPTED', _('Your bid was accepted')
        BID_REJECTED = 'BID_REJECTED', _('Your bid was rejected')
        ASSIGNMENT_REMINDER = 'ASSIGNMENT_REMINDER', _('Upcoming assignment reminder')
        RESOURCE_LOW = 'RESOURCE_LOW', _('Low resource stock alert')
        RESOURCE_CRITICAL = 'RESOURCE_CRITICAL', _('Critical resource shortage')
        VERIFICATION = 'VERIFICATION', _('Account / document verification update')
        SYSTEM = 'SYSTEM', _('System notification')
        MESSAGE = 'MESSAGE', _('Direct message')
        AMBULANCE_REQUEST = 'AMBULANCE_REQUEST', _('New ambulance request')
        AMBULANCE_UPDATE = 'AMBULANCE_UPDATE', _('Ambulance request update')

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Extra payload e.g. contract_id, resource_id')
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.email}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    # Fine-grained
    notify_new_contracts = models.BooleanField(default=True)
    notify_bid_updates = models.BooleanField(default=True)
    notify_resource_alerts = models.BooleanField(default=True)
    notify_assignment_reminders = models.BooleanField(default=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"
