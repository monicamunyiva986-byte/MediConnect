from django.contrib import admin
from .models import (
    ResourceCategory, ResourceType, HospitalResource,
    ResourceTransaction, BloodStock, OxygenSupply
)


@admin.register(ResourceCategory)
class ResourceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_critical', 'unit_label')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(ResourceType)
class ResourceTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'code', 'is_active')
    list_filter = ('category', 'is_active')


@admin.register(HospitalResource)
class HospitalResourceAdmin(admin.ModelAdmin):
    list_display = ('resource_type', 'hospital', 'available_quantity', 'total_capacity', 'is_active', 'last_updated')
    list_filter = ('hospital', 'resource_type__category', 'is_active')
    search_fields = ('resource_type__name', 'hospital__name')


@admin.register(ResourceTransaction)
class ResourceTransactionAdmin(admin.ModelAdmin):
    list_display = ('hospital_resource', 'transaction_type', 'quantity', 'performed_by', 'created_at')
    list_filter = ('transaction_type',)
    readonly_fields = ('created_at',)


@admin.register(BloodStock)
class BloodStockAdmin(admin.ModelAdmin):
    list_display = ('blood_group', 'component', 'hospital', 'units_available', 'expiry_date')
    list_filter = ('blood_group', 'component', 'hospital')


@admin.register(OxygenSupply)
class OxygenSupplyAdmin(admin.ModelAdmin):
    list_display = ('supply_type', 'hospital', 'available_units', 'current_level_litres', 'last_updated')
    list_filter = ('supply_type', 'hospital')
