from rest_framework import serializers
from django.utils import timezone
from .models import WorkContract, Bid, ContractAssignment
from hospitals.serializers import HospitalListSerializer, DepartmentSerializer
from accounts.serializers import UserSerializer


class WorkContractSerializer(serializers.ModelSerializer):
    hospital = HospitalListSerializer(read_only=True)
    hospital_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('hospitals.models', fromlist=['Hospital']).Hospital.objects.all(),
        source='hospital',
        write_only=True
    )
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('hospitals.models', fromlist=['Department']).Department.objects.all(),
        source='department',
        write_only=True,
        required=False,
        allow_null=True
    )
    created_by = UserSerializer(read_only=True)
    bids_count = serializers.SerializerMethodField()
    duration_hours = serializers.ReadOnlyField()
    is_open_for_bidding = serializers.ReadOnlyField()

    class Meta:
        model = WorkContract
        fields = (
            'id', 'hospital', 'hospital_id', 'department', 'department_id',
            'created_by', 'title', 'description', 'contract_type',
            'required_role', 'specialization_required', 'min_years_experience',
            'start_datetime', 'end_datetime', 'location_details',
            'budget_min', 'budget_max', 'currency', 'payment_type',
            'urgency', 'status', 'max_bids', 'requirements', 'benefits',
            'is_public', 'filled_by', 'created_at', 'updated_at',
            'published_at', 'bids_count', 'duration_hours', 'is_open_for_bidding',
        )
        read_only_fields = (
            'id', 'created_by', 'status', 'filled_by',
            'created_at', 'updated_at', 'published_at',
        )

    def get_bids_count(self, obj):
        return obj.bids.count()

    def validate(self, attrs):
        start = attrs.get('start_datetime') or getattr(self.instance, 'start_datetime', None)
        end = attrs.get('end_datetime') or getattr(self.instance, 'end_datetime', None)
        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_datetime": "End datetime must be after start datetime."
            })
        return attrs


class WorkContractListSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    hospital_city = serializers.CharField(source='hospital.city', read_only=True)
    bids_count = serializers.SerializerMethodField()
    duration_hours = serializers.ReadOnlyField()

    class Meta:
        model = WorkContract
        fields = (
            'id', 'title', 'hospital_name', 'hospital_city', 'contract_type',
            'required_role', 'specialization_required', 'start_datetime',
            'end_datetime', 'budget_min', 'budget_max', 'currency',
            'urgency', 'status', 'bids_count', 'duration_hours',
            'created_at',
        )

    def get_bids_count(self, obj):
        return obj.bids.count()


class BidSerializer(serializers.ModelSerializer):
    bidder = UserSerializer(read_only=True)
    contract_title = serializers.CharField(source='contract.title', read_only=True)
    hospital_name = serializers.CharField(source='contract.hospital.name', read_only=True)

    class Meta:
        model = Bid
        fields = (
            'id', 'contract', 'contract_title', 'hospital_name',
            'bidder', 'proposed_rate', 'currency', 'message',
            'availability_confirmed', 'status', 'reviewed_by',
            'reviewed_at', 'review_notes', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'bidder', 'status', 'reviewed_by',
            'reviewed_at', 'review_notes', 'created_at', 'updated_at',
        )

    def validate_contract(self, contract):
        if not contract.is_open_for_bidding:
            raise serializers.ValidationError("This contract is not open for bidding.")
        return contract

    def validate(self, attrs):
        contract = attrs.get('contract') or getattr(self.instance, 'contract', None)
        user = self.context['request'].user
        if contract and Bid.objects.filter(contract=contract, bidder=user).exists():
            if not self.instance:
                raise serializers.ValidationError("You have already placed a bid on this contract.")
        return attrs


class BidCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bid
        fields = ('contract', 'proposed_rate', 'currency', 'message', 'availability_confirmed')


class BidReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['ACCEPTED', 'REJECTED'])
    review_notes = serializers.CharField(required=False, allow_blank=True)


class ContractAssignmentSerializer(serializers.ModelSerializer):
    professional = UserSerializer(read_only=True)
    contract = WorkContractListSerializer(read_only=True)

    class Meta:
        model = ContractAssignment
        fields = (
            'id', 'contract', 'professional', 'accepted_bid',
            'agreed_rate', 'currency', 'start_datetime', 'end_datetime',
            'status', 'check_in_time', 'check_out_time', 'notes',
            'rating_by_hospital', 'rating_by_professional', 'feedback',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
