from django.urls import path
from .views import (
    FirebaseLoginView,
    PhoneLoginView,
    RequestOTPView,
    VerifyOTPView,
    DigiLockerAuthURLView,
    DigiLockerCallbackView,
    DigiLockerStatusView
)

urlpatterns = [
    # Legacy Firebase Auth
    path('auth/firebase/', FirebaseLoginView.as_view(), name='firebase-login'),
    # MSG91 backend-driven OTP (primary flow)
    path('auth/request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    # MSG91 widget access-token flow (alternative)
    path('auth/phone/', PhoneLoginView.as_view(), name='phone-login'),

    # DigiLocker Routes
    path('digilocker/auth-url/', DigiLockerAuthURLView.as_view(), name='digilocker-auth-url'),
    path('digilocker/callback/', DigiLockerCallbackView.as_view(), name='digilocker-callback'),
    path('digilocker/status/', DigiLockerStatusView.as_view(), name='digilocker-status'),
]
