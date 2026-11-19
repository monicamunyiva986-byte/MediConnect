from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from hospitals.models import HospitalStaff
from notifications.models import Notification
from .models import AmbulanceRequest
from .serializers import (
    AmbulanceDispatchSerializer,
    AmbulanceLocationSerializer,
    AmbulanceRequestSerializer,
    AmbulanceStatusSerializer,
)


@extend_schema_view(
    list=extend_schema(tags=['Ambulance']),
    retrieve=extend_schema(tags=['Ambulance']),
    create=extend_schema(tags=['Ambulance']),
)
class AmbulanceRequestViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AmbulanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = AmbulanceRequest.objects.select_related(
        'patient',
        'destination_hospital',
        'dispatcher',
    )

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if not user.is_authenticated:
            return queryset.none()
        if user.is_superuser or user.role == 'ADMIN':
            return queryset

        managed_hospitals = HospitalStaff.objects.filter(
            user=user,
            is_active=True,
            role_at_hospital__in=['ADMIN', 'MANAGER', 'COORDINATOR'],
        ).values_list('hospital_id', flat=True)
        return queryset.filter(
            Q(patient=user) | Q(destination_hospital_id__in=managed_hospitals)
        ).distinct()

    def _can_dispatch(self, user, ambulance_request):
        if user.is_superuser or user.role == 'ADMIN':
            return True
        return HospitalStaff.objects.filter(
            user=user,
            hospital=ambulance_request.destination_hospital,
            is_active=True,
            role_at_hospital__in=['ADMIN', 'MANAGER', 'COORDINATOR'],
        ).exists()

    def _require_dispatcher(self, request, ambulance_request):
        if not self._can_dispatch(request.user, ambulance_request):
            raise PermissionDenied('Only the destination hospital dispatch team can manage this request.')

    def _notify_patient(self, ambulance_request, message):
        Notification.objects.create(
            recipient=ambulance_request.patient,
            notification_type=Notification.NotificationType.AMBULANCE_UPDATE,
            title='Ambulance request update',
            message=message,
            data={
                'ambulance_request_id': ambulance_request.pk,
                'status': ambulance_request.status,
            },
        )

    def perform_create(self, serializer):
        ambulance_request = serializer.save(patient=self.request.user)
        managers = HospitalStaff.objects.filter(
            hospital=ambulance_request.destination_hospital,
            is_active=True,
            role_at_hospital__in=['ADMIN', 'MANAGER', 'COORDINATOR'],
        ).exclude(user=self.request.user).select_related('user')
        for membership in managers:
            Notification.objects.create(
                recipient=membership.user,
                notification_type=Notification.NotificationType.AMBULANCE_REQUEST,
                title='New ambulance request',
                message=(
                    f'{ambulance_request.patient.get_full_name() or ambulance_request.patient.email} '
                    f'requested transport to {ambulance_request.destination_hospital.name}.'
                ),
                data={'ambulance_request_id': ambulance_request.pk},
            )

    @extend_schema(
        request=AmbulanceDispatchSerializer,
        responses=AmbulanceRequestSerializer,
        tags=['Ambulance'],
    )
    @action(detail=True, methods=['post'], url_path='dispatch')
    def dispatch_ambulance(self, request, pk=None):
        ambulance_request = self.get_object()
        self._require_dispatcher(request, ambulance_request)
        if ambulance_request.status != AmbulanceRequest.Status.REQUESTED:
            raise ValidationError({'status': 'Only a newly requested ambulance can be dispatched.'})

        serializer = AmbulanceDispatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        now = timezone.now()
        ambulance_request.ambulance_code = data['ambulance_code']
        ambulance_request.ambulance_latitude = data['latitude']
        ambulance_request.ambulance_longitude = data['longitude']
        ambulance_request.eta_minutes = data['eta_minutes']
        ambulance_request.dispatcher = request.user
        ambulance_request.status = AmbulanceRequest.Status.EN_ROUTE
        ambulance_request.dispatched_at = now
        ambulance_request.save()
        self._notify_patient(
            ambulance_request,
            f'Ambulance {ambulance_request.ambulance_code} is en route. '
            f'Estimated arrival: {ambulance_request.eta_minutes} minutes.',
        )
        return Response(self.get_serializer(ambulance_request).data)

    @extend_schema(
        request=AmbulanceLocationSerializer,
        responses=AmbulanceRequestSerializer,
        tags=['Ambulance'],
    )
    @action(detail=True, methods=['post'], url_path='location')
    def update_location(self, request, pk=None):
        ambulance_request = self.get_object()
        self._require_dispatcher(request, ambulance_request)
        if ambulance_request.status != AmbulanceRequest.Status.EN_ROUTE:
            raise ValidationError({'status': 'Location can only be updated while the ambulance is en route.'})

        serializer = AmbulanceLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ambulance_request.ambulance_latitude = data['latitude']
        ambulance_request.ambulance_longitude = data['longitude']
        if 'eta_minutes' in data:
            ambulance_request.eta_minutes = data['eta_minutes']
        ambulance_request.save()
        return Response(self.get_serializer(ambulance_request).data)

    @extend_schema(
        request=AmbulanceStatusSerializer,
        responses=AmbulanceRequestSerializer,
        tags=['Ambulance'],
    )
    @action(detail=True, methods=['post'], url_path='status')
    def update_status(self, request, pk=None):
        ambulance_request = self.get_object()
        self._require_dispatcher(request, ambulance_request)
        serializer = AmbulanceStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']
        transitions = {
            AmbulanceRequest.Status.EN_ROUTE: {
                AmbulanceRequest.Status.ARRIVED,
                AmbulanceRequest.Status.CANCELLED,
            },
            AmbulanceRequest.Status.ARRIVED: {
                AmbulanceRequest.Status.COMPLETED,
            },
        }
        if new_status not in transitions.get(ambulance_request.status, set()):
            raise ValidationError({
                'status': f'Cannot change status from {ambulance_request.status} to {new_status}.'
            })

        now = timezone.now()
        ambulance_request.status = new_status
        if new_status == AmbulanceRequest.Status.ARRIVED:
            ambulance_request.arrived_at = now
            ambulance_request.eta_minutes = 0
        elif new_status == AmbulanceRequest.Status.COMPLETED:
            ambulance_request.completed_at = now
        elif new_status == AmbulanceRequest.Status.CANCELLED:
            ambulance_request.cancelled_at = now
        ambulance_request.save()
        self._notify_patient(
            ambulance_request,
            f'Your ambulance request is now {ambulance_request.get_status_display().lower()}.',
        )
        return Response(self.get_serializer(ambulance_request).data)

    @extend_schema(
        request=None,
        responses=AmbulanceRequestSerializer,
        tags=['Ambulance'],
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        ambulance_request = self.get_object()
        if ambulance_request.patient_id != request.user.id:
            raise PermissionDenied('Only the patient who created this request can cancel it.')
        if ambulance_request.status != AmbulanceRequest.Status.REQUESTED:
            raise ValidationError({'status': 'Only a request that has not been dispatched can be cancelled.'})
        ambulance_request.status = AmbulanceRequest.Status.CANCELLED
        ambulance_request.cancelled_at = timezone.now()
        ambulance_request.save()
        return Response(self.get_serializer(ambulance_request).data)
