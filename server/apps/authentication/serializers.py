from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import json
from urllib.parse import urlencode
from urllib.request import urlopen


User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already exists.')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        return user


class AuthTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = 'admin' if user.is_superuser else 'agent' if user.is_staff else 'customer'
        return token

    def validate(self, attrs):
        username_or_email = attrs.get('username')
        if username_or_email and '@' in username_or_email:
            user = User.objects.filter(email__iexact=username_or_email).first()
            if user:
                attrs['username'] = user.username
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'name': self.user.get_full_name() or self.user.username,
            'role': 'admin' if self.user.is_superuser else 'agent' if self.user.is_staff else 'customer',
        }
        return data


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            query = urlencode({'id_token': attrs['credential']})
            with urlopen(f'https://oauth2.googleapis.com/tokeninfo?{query}', timeout=8) as response:
                verified = json.loads(response.read())
        except Exception as error:
            raise serializers.ValidationError('Invalid Google credential.') from error

        email = verified.get('email')
        if not email or not verified.get('email_verified'):
            raise serializers.ValidationError('A verified Google email is required.')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': verified.get('given_name', ''),
                'last_name': verified.get('family_name', ''),
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        attrs['user'] = user
        return attrs
