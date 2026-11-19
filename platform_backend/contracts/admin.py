from django.contrib import admin
from .models import WorkContract, Bid, ContractAssignment


class BidInline(admin.TabularInline):
    model = Bid
    extra = 0
    readonly_fields = ('bidder', 'proposed_rate', 'status', 'created_at')


@admin.register(WorkContract)
class WorkContractAdmin(admin.ModelAdmin):
    list_display = ('title', 'hospital', 'required_role', 'status', 'urgency', 'start_datetime', 'created_at')
    list_filter = ('status', 'contract_type', 'required_role', 'urgency', 'hospital')
    search_fields = ('title', 'description', 'hospital__name')
    inlines = [BidInline]
    date_hierarchy = 'start_datetime'


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('contract', 'bidder', 'proposed_rate', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('bidder__email', 'contract__title')


@admin.register(ContractAssignment)
class ContractAssignmentAdmin(admin.ModelAdmin):
    list_display = ('contract', 'professional', 'status', 'start_datetime', 'agreed_rate')
    list_filter = ('status',)
