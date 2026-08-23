from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import AuthTokenObtainPairSerializer, GoogleLoginSerializer, RegisterSerializer


User = get_user_model()


class RegisterView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token_serializer = AuthTokenObtainPairSerializer(data={
            'username': user.username,
            'password': request.data['password'],
        })
        token_serializer.is_valid(raise_exception=True)

        return Response(
            {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': user.get_full_name() or user.username,
                    'role': 'customer',
                },
                'access': token_serializer.validated_data['access'],
                'refresh': token_serializer.validated_data['refresh'],
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = AuthTokenObtainPairSerializer


class GoogleLoginView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = GoogleLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        role = (
            'admin' if getattr(user, 'is_superuser', False)
            else 'agent' if getattr(user, 'is_staff', False)
            else 'customer'
        )
        refresh = RefreshToken.for_user(user)
        refresh['username'] = user.username
        refresh['role'] = role
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'name': user.get_full_name() or user.username,
                'role': role,
            },
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

