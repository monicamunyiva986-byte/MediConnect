from django.contrib import admin

from .models import AmbulanceRequest


@admin.register(AmbulanceRequest)
class AmbulanceRequestAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'patient',
        'destination_hospital',
        'ambulance_code',
        'status',
        'eta_minutes',
        'requested_at',
    )
    list_filter = ('status', 'destination_hospital')
    search_fields = (
        'patient__email',
        'patient__first_name',
        'patient__last_name',
        'ambulance_code',
    )
