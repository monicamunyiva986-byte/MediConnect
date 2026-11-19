from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import (
    ResourceCategory, ResourceType, HospitalResource,
    ResourceTransaction, BloodStock, OxygenSupply
)
from .serializers import (
    ResourceCategorySerializer, ResourceTypeSerializer,
    HospitalResourceSerializer, ResourceTransactionSerializer,
    ResourceAdjustSerializer, BloodStockSerializer, OxygenSupplySerializer,
)
from accounts.permissions import IsHospitalAdmin
from notifications.models import Notification


@extend_schema_view(
    list=extend_schema(tags=['Resources']),
    retrieve=extend_schema(tags=['Resources']),
)
class ResourceCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ResourceCategory.objects.all()
    serializer_class = ResourceCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


@extend_schema_view(
    list=extend_schema(tags=['Resources']),
    retrieve=extend_schema(tags=['Resources']),
)
class ResourceTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ResourceType.objects.filter(is_active=True)
    serializer_class = ResourceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'is_active']


@extend_schema_view(
    list=extend_schema(tags=['Hospital Resources']),
    retrieve=extend_schema(tags=['Hospital Resources']),
    create=extend_schema(tags=['Hospital Resources']),
    update=extend_schema(tags=['Hospital Resources']),
    partial_update=extend_schema(tags=['Hospital Resources']),
)
class HospitalResourceViewSet(viewsets.ModelViewSet):
    queryset = HospitalResource.objects.select_related(
        'hospital', 'resource_type', 'resource_type__category', 'department'
    )
    serializer_class = HospitalResourceSerializer
    filterset_fields = ['hospital', 'resource_type', 'department', 'is_active']
    search_fields = ['resource_type__name', 'hospital__name', 'notes']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'adjust'):
            return [permissions.IsAuthenticated(), IsHospitalAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @extend_schema(tags=['Hospital Resources'], request=ResourceAdjustSerializer)
    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        resource = self.get_object()
        serializer = ResourceAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        qty = data['quantity']
        ttype = data['transaction_type']

        with transaction.atomic():
            prev = resource.available_quantity
            if ttype == 'ADD':
                resource.available_quantity += qty
                if resource.total_capacity < resource.available_quantity:
                    resource.total_capacity = resource.available_quantity
            elif ttype == 'REMOVE':
                if resource.available_quantity < qty:
                    return Response(
                        {"detail": "Insufficient available quantity."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                resource.available_quantity -= qty
            elif ttype == 'RESERVE':
                if resource.available_quantity < qty:
                    return Response(
                        {"detail": "Insufficient available quantity to reserve."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                resource.available_quantity -= qty
                resource.reserved_quantity += qty
            elif ttype == 'RELEASE':
                if resource.reserved_quantity < qty:
                    return Response(
                        {"detail": "Cannot release more than reserved."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                resource.reserved_quantity -= qty
                resource.available_quantity += qty
            elif ttype == 'ADJUST':
                # Absolute set
                resource.available_quantity = qty

            resource.updated_by = request.user
            resource.save()

            ResourceTransaction.objects.create(
                hospital_resource=resource,
                transaction_type=ttype,
                quantity=qty if ttype != 'ADJUST' else (qty - prev),
                previous_available=prev,
                new_available=resource.available_quantity,
                performed_by=request.user,
                reason=data.get('reason', ''),
                reference=data.get('reference', ''),
            )

            # Low stock notification
            if resource.is_critical or resource.is_low_stock:
                for membership in resource.hospital.staff_members.filter(
                    role_at_hospital__in=['ADMIN', 'MANAGER'],
                    is_active=True
                ):
                    Notification.objects.create(
                        recipient=membership.user,
                        notification_type=(
                            Notification.NotificationType.RESOURCE_CRITICAL
                            if resource.is_critical
                            else Notification.NotificationType.RESOURCE_LOW
                        ),
                        title=f"Low stock: {resource.resource_type.name}",
                        message=(
                            f"{resource.resource_type.name} at {resource.hospital.name} "
                            f"is now at {resource.available_quantity} "
                            f"(threshold: {resource.low_stock_threshold})."
                        ),
                        data={
                            'resource_id': resource.id,
                            'hospital_id': resource.hospital_id,
                            'available': resource.available_quantity,
                        }
                    )

        return Response(HospitalResourceSerializer(resource).data)

    @extend_schema(tags=['Hospital Resources'])
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        resource = self.get_object()
        txs = resource.transactions.all()[:50]
        serializer = ResourceTransactionSerializer(txs, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=['Blood Stock']),
    retrieve=extend_schema(tags=['Blood Stock']),
    create=extend_schema(tags=['Blood Stock']),
    update=extend_schema(tags=['Blood Stock']),
    partial_update=extend_schema(tags=['Blood Stock']),
)
class BloodStockViewSet(viewsets.ModelViewSet):
    queryset = BloodStock.objects.select_related('hospital')
    serializer_class = BloodStockSerializer
    filterset_fields = ['hospital', 'blood_group', 'component']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsHospitalAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema_view(
    list=extend_schema(tags=['Oxygen Supply']),
    retrieve=extend_schema(tags=['Oxygen Supply']),
    create=extend_schema(tags=['Oxygen Supply']),
    update=extend_schema(tags=['Oxygen Supply']),
    partial_update=extend_schema(tags=['Oxygen Supply']),
)
class OxygenSupplyViewSet(viewsets.ModelViewSet):
    queryset = OxygenSupply.objects.select_related('hospital')
    serializer_class = OxygenSupplySerializer
    filterset_fields = ['hospital', 'supply_type']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsHospitalAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
