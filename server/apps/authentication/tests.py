from django.test import TestCase
from rest_framework.test import APIClient


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_returns_tokens(self):
        payload = {
            'username': 'alice',
            'email': 'alice@example.com',
            'password': 'StrongPass123',
        }

        response = self.client.post('/api/auth/register/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_returns_tokens_for_valid_credentials(self):
        from django.contrib.auth import get_user_model

        get_user_model().objects.create_user(
            username='bob',
            email='bob@example.com',
            password='StrongPass123',
        )

        response = self.client.post(
            '/api/auth/login/',
            {'username': 'bob', 'password': 'StrongPass123'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_accepts_email_instead_of_username(self):
        from django.contrib.auth import get_user_model

        get_user_model().objects.create_user(
            username='carol',
            email='carol@example.com',
            password='StrongPass123',
        )

        response = self.client.post(
            '/api/auth/login/',
            {'username': 'carol@example.com', 'password': 'StrongPass123'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
