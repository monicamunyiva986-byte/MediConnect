from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Hospital(models.Model):
    name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Kenya')
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='hospital_logos/', blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = _('hospital')
        verbose_name_plural = _('hospitals')

    def __str__(self):
        return self.name


class Department(models.Model):
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    head_of_department = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('hospital', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.hospital.name})"


class HospitalStaff(models.Model):
    """Link users (admins / staff) to hospitals they manage or work at."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hospital_memberships'
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='staff_members'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff'
    )
    role_at_hospital = models.CharField(
        max_length=50,
        choices=[
            ('ADMIN', 'Hospital Admin'),
            ('MANAGER', 'Department Manager'),
            ('COORDINATOR', 'Staffing Coordinator'),
            ('STAFF', 'Regular Staff'),
        ],
        default='STAFF'
    )
    is_primary = models.BooleanField(
        default=False,
        help_text=_('Primary hospital for this user')
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'hospital')
        verbose_name_plural = 'Hospital staff'

    def __str__(self):
        return f"{self.user.email} @ {self.hospital.name}"
