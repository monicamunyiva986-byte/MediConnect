from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class NotificationPreferenceEndpointTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='preferences@example.test',
            password='SafePassword123!',
        )
        self.client.force_authenticate(self.user)

    def test_get_returns_defaults_and_patch_updates_preferences_at_documented_route(self):
        response = self.client.get('/api/preferences/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['email_enabled'])
        self.assertFalse(response.data['sms_enabled'])

        response = self.client.patch(
            '/api/preferences/',
            {'sms_enabled': True, 'notify_new_contracts': False},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['sms_enabled'])
        self.assertFalse(response.data['notify_new_contracts'])
