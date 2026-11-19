from rest_framework import serializers
from .models import (
    ResourceCategory, ResourceType, HospitalResource,
    ResourceTransaction, BloodStock, OxygenSupply
)


class ResourceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceCategory
        fields = ('id', 'name', 'slug', 'description', 'icon', 'is_critical', 'unit_label')


class ResourceTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = ResourceType
        fields = (
            'id', 'category', 'category_name', 'name', 'code',
            'description', 'attributes', 'is_active',
        )


class HospitalResourceSerializer(serializers.ModelSerializer):
    resource_type = ResourceTypeSerializer(read_only=True)
    resource_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ResourceType.objects.filter(is_active=True),
        source='resource_type',
        write_only=True
    )
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    occupancy_rate = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    is_critical = serializers.ReadOnlyField()

    class Meta:
        model = HospitalResource
        fields = (
            'id', 'hospital', 'hospital_name', 'resource_type', 'resource_type_id',
            'department', 'total_capacity', 'available_quantity', 'reserved_quantity',
            'unit', 'low_stock_threshold', 'last_updated', 'updated_by',
            'notes', 'is_active', 'occupancy_rate', 'is_low_stock', 'is_critical',
        )
        read_only_fields = ('id', 'last_updated', 'updated_by')


class ResourceTransactionSerializer(serializers.ModelSerializer):
    performed_by_email = serializers.CharField(source='performed_by.email', read_only=True)

    class Meta:
        model = ResourceTransaction
        fields = (
            'id', 'hospital_resource', 'transaction_type', 'quantity',
            'previous_available', 'new_available', 'performed_by',
            'performed_by_email', 'reason', 'reference', 'metadata', 'created_at',
        )
        read_only_fields = (
            'id', 'previous_available', 'new_available',
            'performed_by', 'created_at',
        )


class ResourceAdjustSerializer(serializers.Serializer):
    transaction_type = serializers.ChoiceField(
        choices=['ADD', 'REMOVE', 'RESERVE', 'RELEASE', 'ADJUST']
    )
    quantity = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True)
    reference = serializers.CharField(required=False, allow_blank=True)


class BloodStockSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = BloodStock
        fields = (
            'id', 'hospital', 'hospital_name', 'blood_group', 'component',
            'units_available', 'units_reserved', 'expiry_date', 'batch_number',
            'low_stock_threshold', 'last_updated', 'updated_by', 'is_low_stock',
        )
        read_only_fields = ('id', 'last_updated', 'updated_by')


class OxygenSupplySerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    level_percentage = serializers.ReadOnlyField()
    is_low = serializers.ReadOnlyField()

    class Meta:
        model = OxygenSupply
        fields = (
            'id', 'hospital', 'hospital_name', 'supply_type',
            'capacity_litres', 'current_level_litres', 'number_of_units',
            'available_units', 'low_level_threshold_pct', 'location',
            'last_refilled', 'last_updated', 'updated_by', 'notes',
            'level_percentage', 'is_low',
        )
        read_only_fields = ('id', 'last_updated', 'updated_by')
