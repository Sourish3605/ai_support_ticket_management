from rest_framework_simplejwt.authentication import JWTAuthentication


class SafeJWTAuthentication(JWTAuthentication):
    """
    Safely authenticates JWT tokens if present and valid.
    If token is invalid, expired, or a demo mock token, returns None instead of raising 401.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            return None
