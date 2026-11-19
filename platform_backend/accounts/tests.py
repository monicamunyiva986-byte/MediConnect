from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


User = get_user_model()


class PatientRegistrationTests(APITestCase):
    def test_patient_can_self_register(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'patient@example.test',
            'password': 'Strong-test-password-752!',
            'password_confirm': 'Strong-test-password-752!',
            'first_name': 'Test',
            'last_name': 'Patient',
            'role': User.Role.PATIENT,
            'phone': '+254700000000',
        })

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='patient@example.test')
        self.assertEqual(user.role, User.Role.PATIENT)
        self.assertTrue(user.check_password('Strong-test-password-752!'))
