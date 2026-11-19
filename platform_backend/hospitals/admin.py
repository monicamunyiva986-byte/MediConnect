from django.contrib import admin
from .models import Hospital, Department, HospitalStaff


class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 0


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'phone', 'is_active', 'created_at')
    list_filter = ('city', 'country', 'is_active')
    search_fields = ('name', 'registration_number', 'city')
    inlines = [DepartmentInline]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'hospital', 'is_active')
    list_filter = ('hospital', 'is_active')


@admin.register(HospitalStaff)
class HospitalStaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'hospital', 'role_at_hospital', 'is_primary', 'is_active')
    list_filter = ('role_at_hospital', 'is_active', 'hospital')
