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


class UserListCreateView(GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        users_data = []
        for u in User.objects.all().order_by("id"):
            profile = getattr(u, "profile", None)
            role = getattr(profile, "role", "Agent" if u.is_staff else "Customer")
            if u.is_superuser:
                role = "Admin"
            users_data.append({
                "id": u.id,
                "username": u.username,
                "name": u.get_full_name() or u.username,
                "email": u.email or f"{u.username}@supportpilot.com",
                "role": role,
                "department": getattr(profile, "department", "IT Department"),
                "title": getattr(profile, "title", f"{role} Specialist"),
                "availability_status": getattr(profile, "availability_status", "AVAILABLE"),
                "status": "Active" if u.is_active else "Inactive",
            })
        return Response(users_data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        data = request.data
        username = data.get("username") or data.get("email", "").split("@")[0] or f"user_{User.objects.count() + 1}"
        email = data.get("email", f"{username}@supportpilot.com")
        role = data.get("role", "Agent")
        department = data.get("department", "IT Department")
        title = data.get("title", "")
        name = data.get("name", username)

        existing = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()
        if existing:
            user = existing
        else:
            user = User.objects.create_user(
                username=username,
                email=email,
                password="password123",
                first_name=name.split()[0] if name else username,
                last_name=" ".join(name.split()[1:]) if name and len(name.split()) > 1 else "",
            )

        user.is_staff = (role.lower() in ["agent", "support agent", "manager", "admin"])
        user.is_superuser = (role.lower() == "admin")
        user.save()

        from apps.staff.models import Profile
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = "Admin" if user.is_superuser else ("Manager" if "manager" in role.lower() else ("Agent" if user.is_staff else "Customer"))
        profile.department = department
        if title:
            profile.title = title
        profile.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "role": profile.role,
            "department": profile.department,
            "title": profile.title,
            "availability_status": profile.availability_status,
            "status": "Active" if user.is_active else "Inactive",
        }, status=status.HTTP_201_CREATED)


class UserDetailDeleteView(GenericAPIView):
    permission_classes = [AllowAny]

    def find_user(self, identifier):
        if not identifier:
            return None
        ident_str = str(identifier).strip()
        if ident_str.isdigit():
            u = User.objects.filter(id=int(ident_str)).first()
            if u:
                return u
        u = User.objects.filter(email__iexact=ident_str).first()
        if u:
            return u
        u = User.objects.filter(username__iexact=ident_str).first()
        if u:
            return u
        u = User.objects.filter(username__iexact=ident_str.split("@")[0]).first()
        return u

    def get(self, request, identifier, *args, **kwargs):
        user = self.find_user(identifier)
        if not user:
            return Response({"error": f"User '{identifier}' not found."}, status=status.HTTP_404_NOT_FOUND)
        profile = getattr(user, "profile", None)
        role = getattr(profile, "role", "Agent" if user.is_staff else "Customer")
        if user.is_superuser:
            role = "Admin"
        return Response({
            "id": user.id,
            "username": user.username,
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "role": role,
            "department": getattr(profile, "department", "IT Department"),
            "title": getattr(profile, "title", ""),
            "availability_status": getattr(profile, "availability_status", "AVAILABLE"),
            "status": "Active" if user.is_active else "Inactive",
        }, status=status.HTTP_200_OK)

    def delete(self, request, identifier, *args, **kwargs):
        user = self.find_user(identifier)
        if not user:
            return Response(
                {"error": f"User '{identifier}' not found in database."},
                status=status.HTTP_404_NOT_FOUND
            )

        user_id = user.id
        username = user.username
        email = user.email

        # 1. Unassign any tickets currently assigned to this user
        from apps.support.models import Ticket
        Ticket.objects.filter(assigned_to=user).update(
            assigned_to=None,
            status="OPEN"
        )

        # 2. Preserve created tickets by reassigning created_by to another staff/admin user
        admin_user = User.objects.filter(is_superuser=True).exclude(id=user_id).first() or \
                     User.objects.exclude(id=user_id).first()
        if admin_user:
            Ticket.objects.filter(created_by=user).update(created_by=admin_user)

        # 3. Permanently delete user
        user.delete()

        return Response({
            "success": True,
            "message": f"User '{username}' ({email}) permanently removed from all systems, departments, and queues.",
            "deleted_id": user_id,
            "deleted_email": email,
            "deleted_username": username,
        }, status=status.HTTP_200_OK)


