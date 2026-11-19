from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class AmbulanceRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', _('Requested')
        DISPATCHED = 'DISPATCHED', _('Dispatched')
        EN_ROUTE = 'EN_ROUTE', _('En route')
        ARRIVED = 'ARRIVED', _('Arrived')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ambulance_requests',
    )
    destination_hospital = models.ForeignKey(
        'hospitals.Hospital',
        on_delete=models.PROTECT,
        related_name='ambulance_requests',
    )
    pickup_address = models.TextField()
    pickup_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    pickup_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    patient_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
    )
    ambulance_code = models.CharField(max_length=100, blank=True)
    dispatcher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatched_ambulance_requests',
    )
    ambulance_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    ambulance_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    eta_minutes = models.PositiveSmallIntegerField(null=True, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['destination_hospital', 'status']),
        ]

    def __str__(self):
        return f'Ambulance request {self.pk} ({self.status})'


