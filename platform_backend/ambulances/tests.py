from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from hospitals.models import Hospital, HospitalStaff
from .models import AmbulanceRequest


User = get_user_model()


class AmbulanceRequestApiTests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email='patient@example.test',
            password='TestPass123!',
            role=User.Role.PATIENT,
        )
        self.dispatcher = User.objects.create_user(
            email='dispatcher@example.test',
            password='TestPass123!',
            role=User.Role.HOSPITAL_ADMIN,
        )
        self.hospital = Hospital.objects.create(
            name='Demo Hospital',
            registration_number='TEST-AMB-001',
            address='1 Test Road',
            city='Nairobi',
            country='Kenya',
            phone='+254700000000',
            email='hospital@example.test',
            latitude=-1.2921,
            longitude=36.8219,
        )
        HospitalStaff.objects.create(
            user=self.dispatcher,
            hospital=self.hospital,
            role_at_hospital='COORDINATOR',
        )
        self.request_payload = {
            'destination_hospital': self.hospital.pk,
            'pickup_address': '1 Example Street, Nairobi',
            'pickup_latitude': '-1.280000',
            'pickup_longitude': '36.820000',
            'patient_notes': 'Demo request',
        }

    def test_patient_can_create_and_read_own_request(self):
        self.client.force_authenticate(self.patient)
        response = self.client.post(
            '/api/ambulance/requests/',
            self.request_payload,
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], AmbulanceRequest.Status.REQUESTED)
        self.assertEqual(response.data['patient'], self.patient.pk)
        self.assertEqual(
            self.client.get('/api/ambulance/requests/').data['results'][0]['id'],
            response.data['id'],
        )

    def test_destination_hospital_dispatcher_can_dispatch_and_update_status(self):
        ambulance_request = AmbulanceRequest.objects.create(
            patient=self.patient,
            destination_hospital=self.hospital,
            pickup_address='1 Example Street, Nairobi',
            pickup_latitude=-1.28,
            pickup_longitude=36.82,
        )
        self.client.force_authenticate(self.dispatcher)

        response = self.client.post(
            f'/api/ambulance/requests/{ambulance_request.pk}/dispatch/',
            {
                'ambulance_code': 'AMB-TEST-1',
                'latitude': '-1.290000',
                'longitude': '36.820000',
                'eta_minutes': 12,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], AmbulanceRequest.Status.EN_ROUTE)

        response = self.client.post(
            f'/api/ambulance/requests/{ambulance_request.pk}/status/',
            {'status': AmbulanceRequest.Status.ARRIVED},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], AmbulanceRequest.Status.ARRIVED)

    def test_patient_cannot_dispatch_or_read_another_patients_request(self):
        other_patient = User.objects.create_user(
            email='other@example.test',
            password='TestPass123!',
            role=User.Role.PATIENT,
        )
        ambulance_request = AmbulanceRequest.objects.create(
            patient=other_patient,
            destination_hospital=self.hospital,
            pickup_address='2 Example Street, Nairobi',
            pickup_latitude=-1.28,
            pickup_longitude=36.82,
        )
        self.client.force_authenticate(self.patient)

        response = self.client.post(
            f'/api/ambulance/requests/{ambulance_request.pk}/dispatch/',
            {
                'ambulance_code': 'AMB-TEST-1',
                'latitude': '-1.290000',
                'longitude': '36.820000',
                'eta_minutes': 12,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 404)
