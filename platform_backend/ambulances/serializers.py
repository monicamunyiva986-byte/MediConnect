from decimal import Decimal

from rest_framework import serializers

from hospitals.models import Hospital
from .models import AmbulanceRequest


class AmbulanceRequestSerializer(serializers.ModelSerializer):
    destination_hospital_name = serializers.CharField(
        source='destination_hospital.name',
        read_only=True,
    )
    destination_hospital_city = serializers.CharField(
        source='destination_hospital.city',
        read_only=True,
    )
    destination_hospital_latitude = serializers.DecimalField(
        source='destination_hospital.latitude',
        max_digits=9,
        decimal_places=6,
        read_only=True,
        allow_null=True,
    )
    destination_hospital_longitude = serializers.DecimalField(
        source='destination_hospital.longitude',
        max_digits=9,
        decimal_places=6,
        read_only=True,
        allow_null=True,
    )
    patient_name = serializers.SerializerMethodField()
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    dispatcher_name = serializers.SerializerMethodField()

    class Meta:
        model = AmbulanceRequest
        fields = (
            'id',
            'patient',
            'patient_name',
            'patient_phone',
            'destination_hospital',
            'destination_hospital_name',
            'destination_hospital_city',
            'destination_hospital_latitude',
            'destination_hospital_longitude',
            'pickup_address',
            'pickup_latitude',
            'pickup_longitude',
            'patient_notes',
            'status',
            'ambulance_code',
            'dispatcher',
            'dispatcher_name',
            'ambulance_latitude',
            'ambulance_longitude',
            'eta_minutes',
            'requested_at',
            'updated_at',
            'dispatched_at',
            'arrived_at',
            'completed_at',
            'cancelled_at',
        )
        read_only_fields = (
            'id',
            'patient',
            'status',
            'ambulance_code',
            'dispatcher',
            'ambulance_latitude',
            'ambulance_longitude',
            'eta_minutes',
            'requested_at',
            'updated_at',
            'dispatched_at',
            'arrived_at',
            'completed_at',
            'cancelled_at',
        )

    def get_patient_name(self, obj):
        return obj.patient.get_full_name() or obj.patient.email

    def get_dispatcher_name(self, obj):
        if not obj.dispatcher:
            return ''
        return obj.dispatcher.get_full_name() or obj.dispatcher.email


class AmbulanceDispatchSerializer(serializers.Serializer):
    ambulance_code = serializers.CharField(max_length=100)
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        min_value=Decimal('-90'),
        max_value=Decimal('90'),
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        min_value=Decimal('-180'),
        max_value=Decimal('180'),
    )
    eta_minutes = serializers.IntegerField(min_value=0, max_value=1440)


class AmbulanceLocationSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        min_value=Decimal('-90'),
        max_value=Decimal('90'),
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        min_value=Decimal('-180'),
        max_value=Decimal('180'),
    )
    eta_minutes = serializers.IntegerField(min_value=0, max_value=1440, required=False)


class AmbulanceStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AmbulanceRequest.Status.choices)
