from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model

User = get_user_model()


class SafeJWTAuthentication(JWTAuthentication):
    """
    Safely authenticates JWT tokens if present and valid.
    If token is a demo mock token or client passes X-User-* headers,
    resolves the corresponding user from the database so demo and offline
    modes can access protected APIs.
    """
    def authenticate(self, request):
        # 1. Try standard JWT
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                try:
                    validated_token = self.get_validated_token(raw_token)
                    return self.get_user(validated_token), validated_token
                except Exception:
                    pass

        # 2. Check X-User-Email / X-User-Username headers (from client interceptor)
        user_email = request.headers.get("X-User-Email") or request.META.get("HTTP_X_USER_EMAIL")
        user_username = request.headers.get("X-User-Username") or request.META.get("HTTP_X_USER_USERNAME")
        user_id = request.headers.get("X-User-Id") or request.META.get("HTTP_X_USER_ID")

        if user_email:
            clean_email = str(user_email).strip()
            user = User.objects.filter(email__iexact=clean_email).first()
            if not user:
                user = User.objects.filter(username__iexact=clean_email).first()
            if user:
                return user, None

        if user_username:
            clean_uname = str(user_username).strip()
            user = User.objects.filter(username__iexact=clean_uname).first()
            if not user:
                user = User.objects.filter(email__iexact=clean_uname).first()
            if user:
                return user, None

        if user_id and str(user_id).isdigit():
            user = User.objects.filter(id=int(user_id)).first()
            if user:
                return user, None

        # 3. Check for demo bearer token string if header was present
        if header is not None:
            raw_str = header.decode("utf-8") if isinstance(header, bytes) else str(header)
            token_val = raw_str.replace("Bearer", "").strip().lower()
            if "customer" in token_val:
                user = User.objects.filter(email__iexact="customer@gmail.com").first() or User.objects.filter(username__iexact="customer").first()
                if user:
                    return user, None
            elif "agent" in token_val:
                user = User.objects.filter(email__iexact="agent@gmail.com").first() or User.objects.filter(username__iexact="agent").first()
                if user:
                    return user, None
            elif "admin" in token_val:
                user = User.objects.filter(email__iexact="admin@gmail.com").first() or User.objects.filter(username__iexact="admin").first()
                if user:
                    return user, None

        return None

