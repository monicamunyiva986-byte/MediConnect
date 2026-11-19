from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from hospitals.models import Hospital
from .models import ContractAssignment, WorkContract


class ContractAssignmentCheckInTests(APITestCase):
    def setUp(self):
        self.professional = get_user_model().objects.create_user(
            email='professional@example.test',
            password='SafePassword123!',
            role='DOCTOR',
        )
        hospital = Hospital.objects.create(
            name='Test Hospital',
            registration_number='TEST-HOSPITAL-1',
            address='1 Test Street',
            city='Nairobi',
            phone='+254700000000',
            email='hospital@example.test',
        )
        start = timezone.now() + timedelta(days=1)
        end = start + timedelta(hours=8)
        contract = WorkContract.objects.create(
            hospital=hospital,
            title='Test shift',
            description='Test assignment workflow',
            start_datetime=start,
            end_datetime=end,
        )
        self.assignment = ContractAssignment.objects.create(
            contract=contract,
            professional=self.professional,
            agreed_rate='100.00',
            start_datetime=start,
            end_datetime=end,
        )
        self.client.force_authenticate(self.professional)

    def test_check_in_and_check_out_actions_accept_post(self):
        response = self.client.post(f'/api/assignments/{self.assignment.id}/check_in/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'IN_PROGRESS')

        response = self.client.post(f'/api/assignments/{self.assignment.id}/check_out/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'COMPLETED')
