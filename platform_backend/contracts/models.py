from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal


class WorkContract(models.Model):
    class ContractType(models.TextChoices):
        SHIFT = 'SHIFT', _('Single Shift')
        SHORT_TERM = 'SHORT_TERM', _('Short-term (days/weeks)')
        LONG_TERM = 'LONG_TERM', _('Long-term / Locum')
        ON_CALL = 'ON_CALL', _('On-call')
        FULL_TIME = 'FULL_TIME', _('Full-time permanent')

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        OPEN = 'OPEN', _('Open for bidding')
        CLOSED = 'CLOSED', _('Closed for bidding')
        FILLED = 'FILLED', _('Position filled')
        CANCELLED = 'CANCELLED', _('Cancelled')
        COMPLETED = 'COMPLETED', _('Completed')

    class Urgency(models.TextChoices):
        LOW = 'LOW', _('Low')
        NORMAL = 'NORMAL', _('Normal')
        HIGH = 'HIGH', _('High')
        CRITICAL = 'CRITICAL', _('Critical / Emergency')

    hospital = models.ForeignKey(
        'hospitals.Hospital',
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    department = models.ForeignKey(
        'hospitals.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contracts'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_contracts'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    contract_type = models.CharField(
        max_length=20,
        choices=ContractType.choices,
        default=ContractType.SHIFT
    )
    required_role = models.CharField(
        max_length=20,
        choices=[
            ('DOCTOR', 'Doctor'),
            ('NURSE', 'Nurse'),
            ('SPECIALIST', 'Specialist'),
            ('ANY', 'Any qualified professional'),
        ],
        default='ANY'
    )
    specialization_required = models.CharField(max_length=150, blank=True)
    min_years_experience = models.PositiveIntegerField(default=0)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location_details = models.CharField(
        max_length=255,
        blank=True,
        help_text=_('Ward, room, or specific location within hospital')
    )
    budget_min = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    budget_max = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='KES')
    payment_type = models.CharField(
        max_length=20,
        choices=[
            ('HOURLY', 'Hourly rate'),
            ('FIXED', 'Fixed amount'),
            ('DAILY', 'Daily rate'),
            ('SHIFT', 'Per shift'),
        ],
        default='SHIFT'
    )
    urgency = models.CharField(
        max_length=20,
        choices=Urgency.choices,
        default=Urgency.NORMAL
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    max_bids = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_('Optional limit on number of bids')
    )
    requirements = models.JSONField(
        default=list,
        blank=True,
        help_text=_('List of specific requirements / certifications')
    )
    benefits = models.TextField(blank=True)
    is_public = models.BooleanField(
        default=True,
        help_text=_('Visible to all qualified professionals')
    )
    filled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='filled_contracts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-urgency', '-created_at']
        indexes = [
            models.Index(fields=['status', 'start_datetime']),
            models.Index(fields=['required_role', 'status']),
            models.Index(fields=['hospital', 'status']),
        ]

    def __str__(self):
        return f"{self.title} @ {self.hospital.name} ({self.status})"

    @property
    def is_open_for_bidding(self):
        return self.status == self.Status.OPEN

    @property
    def duration_hours(self):
        if self.start_datetime and self.end_datetime:
            delta = self.end_datetime - self.start_datetime
            return round(delta.total_seconds() / 3600, 2)
        return None


class Bid(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending review')
        ACCEPTED = 'ACCEPTED', _('Accepted')
        REJECTED = 'REJECTED', _('Rejected')
        WITHDRAWN = 'WITHDRAWN', _('Withdrawn by bidder')
        EXPIRED = 'EXPIRED', _('Expired')

    contract = models.ForeignKey(
        WorkContract,
        on_delete=models.CASCADE,
        related_name='bids'
    )
    bidder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bids'
    )
    proposed_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='KES')
    message = models.TextField(
        blank=True,
        help_text=_('Cover note / why you are a good fit')
    )
    availability_confirmed = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_bids'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('contract', 'bidder')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['contract', 'status']),
            models.Index(fields=['bidder', 'status']),
        ]

    def __str__(self):
        return f"Bid by {self.bidder.email} on {self.contract.title}"


class ContractAssignment(models.Model):
    """Final assignment after a bid is accepted."""
    contract = models.OneToOneField(
        WorkContract,
        on_delete=models.CASCADE,
        related_name='assignment'
    )
    professional = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    accepted_bid = models.OneToOneField(
        Bid,
        on_delete=models.SET_NULL,
        null=True,
        related_name='resulting_assignment'
    )
    agreed_rate = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('SCHEDULED', 'Scheduled'),
            ('IN_PROGRESS', 'In Progress'),
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled'),
            ('NO_SHOW', 'No Show'),
        ],
        default='SCHEDULED'
    )
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    rating_by_hospital = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text=_('1-5 rating given by hospital')
    )
    rating_by_professional = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text=_('1-5 rating given by professional')
    )
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Assignment: {self.professional.email} → {self.contract.title}"
