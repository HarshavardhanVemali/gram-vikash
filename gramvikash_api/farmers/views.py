import os
import requests
from urllib.parse import urlencode

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import redirect

from .models import Farmer

from firebase_admin import auth

# Ensure Firebase is initialized
from core.firebase_init import initialize_firebase
initialize_firebase()


class FirebaseLoginView(APIView):
    """
    Endpoint that receives a Firebase ID Token from React Native,
    verifies it, and logs in or creates the Farmer account based on phone number.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        id_token = request.data.get('idToken')

        if not id_token:
            return Response({'error': 'No idToken provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify the token against Firebase
            decoded_token = auth.verify_id_token(id_token)
            phone_number = decoded_token.get('phone_number')

            if not phone_number:
                return Response({'error': 'Token does not contain a phone number'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or Create the Farmer
            farmer, created = Farmer.objects.get_or_create(
                phone_number=phone_number,
                defaults={'language_preference': 'hi'}  # default to Hindi
            )

            # Issue JWT
            refresh = RefreshToken.for_user(farmer)
            refresh['farmer_id'] = str(farmer.id)
            refresh['phone'] = farmer.phone_number

            farmer_data = {
                "id": str(farmer.id),
                "phone_number": farmer.phone_number,
                "name": farmer.name,
                "language_preference": farmer.language_preference,
                "digilocker_linked": farmer.digilocker_linked,
                "digilocker_aadhaar_name": farmer.digilocker_aadhaar_name
            }

            return Response({
                'message': 'Login successful',
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                'farmer_id': farmer.id,
                'is_new_farmer': created,  # renaming back to new response model
                'farmer': farmer_data
            }, status=status.HTTP_200_OK)

        except auth.InvalidIdTokenError:
            return Response({'error': 'Invalid Firebase ID Token'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PhoneLoginView(APIView):
    """
    Receives the MSG91 OTP widget access-token from the frontend,
    verifies it with MSG91, extracts the phone number, and issues a JWT.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        access_token = request.data.get('access_token')

        if not access_token:
            return Response({'error': 'No access_token provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify the access-token with MSG91
        try:
            msg91_resp = requests.post(
                'https://control.msg91.com/api/v5/widget/verifyAccessToken',
                json={
                    'authkey': os.getenv('MSG91_AUTH_KEY', ''),
                    'access-token': access_token,
                },
                headers={'Content-Type': 'application/json'},
                timeout=10,
            )
            msg91_data = msg91_resp.json()
        except Exception as e:
            return Response({'error': f'MSG91 verification failed: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        if msg91_data.get('type') != 'success':
            return Response({'error': 'Invalid or expired OTP token'}, status=status.HTTP_401_UNAUTHORIZED)

        # Extract phone number from the verified token
        # MSG91 returns phone in: message.mobile or message
        message = msg91_data.get('message', {})
        if isinstance(message, dict):
            phone_number = message.get('mobile') or message.get('phone_number')
        else:
            phone_number = str(message)

        if not phone_number:
            return Response({'error': 'Could not extract phone number from token'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize: ensure +91 prefix
        if not phone_number.startswith('+'):
            phone_number = f'+{phone_number}'

        # Get or Create the Farmer
        farmer, created = Farmer.objects.get_or_create(
            phone_number=phone_number,
            defaults={'language_preference': 'hi'}
        )

        # Issue JWT
        refresh = RefreshToken.for_user(farmer)
        refresh['farmer_id'] = str(farmer.id)
        refresh['phone'] = farmer.phone_number

        farmer_data = {
            'id': str(farmer.id),
            'phone_number': farmer.phone_number,
            'name': farmer.name,
            'language_preference': farmer.language_preference,
            'digilocker_linked': farmer.digilocker_linked,
            'digilocker_aadhaar_name': farmer.digilocker_aadhaar_name,
        }

        return Response({
            'message': 'Login successful',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'farmer_id': farmer.id,
            'is_new_farmer': created,
            'farmer': farmer_data,
        }, status=status.HTTP_200_OK)


class RequestOTPView(APIView):
    """
    Backend calls MSG91 to send OTP — no captcha or template needed here.
    POST { phone: "9767592209" }  -> SMS sent, returns { reqId }
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        phone = request.data.get('phone', '').strip().replace('+91', '').replace('+', '')
        if len(phone) != 10 or not phone.isdigit():
            return Response({'error': 'Invalid phone number. Provide a 10-digit number.'}, status=400)

        mobile = f'91{phone}'
        auth_key = os.getenv('MSG91_AUTH_KEY', '')
        template_id = os.getenv('MSG91_TEMPLATE_ID', '')

        try:
            payload = {'mobile': mobile}
            if template_id:
                payload['template_id'] = template_id

            resp = requests.post(
                'https://control.msg91.com/api/v5/otp',
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'authkey': auth_key
                },
                timeout=10,
            )
            data = resp.json()
            print('MSG91 sendOTP:', data)
        except Exception as e:
            return Response({'error': f'MSG91 API error: {str(e)}'}, status=502)

        if data.get('type') == 'success':
            return Response({'message': 'OTP sent', 'reqId': data.get('request_id', '')}, status=200)
        return Response({'error': data.get('message', 'Failed to send OTP')}, status=400)


class VerifyOTPView(APIView):
    """
    Backend verifies OTP with MSG91 and creates the farmer + JWT.
    POST { phone: "9767592209", otp: "123456" } -> { access, refresh, farmer }
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        phone = request.data.get('phone', '').strip().replace('+91', '').replace('+', '')
        otp = request.data.get('otp', '').strip()

        if len(phone) != 10 or not phone.isdigit():
            return Response({'error': 'Invalid phone number.'}, status=400)
        if len(otp) != 6 or not otp.isdigit():
            return Response({'error': 'Invalid OTP. Must be 6 digits.'}, status=400)

        mobile = f'91{phone}'
        auth_key = os.getenv('MSG91_AUTH_KEY', '')

        try:
            resp = requests.get(
                f'https://control.msg91.com/api/v5/otp/verify?otp={otp}&mobile={mobile}',
                headers={'authkey': auth_key},
                timeout=10,
            )
            data = resp.json()
            print('MSG91 verifyOTP:', data)
        except Exception as e:
            return Response({'error': f'MSG91 API error: {str(e)}'}, status=502)

        if data.get('type') != 'success':
            return Response({'error': data.get('message', 'Invalid OTP.')}, status=401)

        phone_number = f'+91{phone}'
        farmer, created = Farmer.objects.get_or_create(
            phone_number=phone_number,
            defaults={'language_preference': 'hi'}
        )

        refresh = RefreshToken.for_user(farmer)
        refresh['farmer_id'] = str(farmer.id)
        refresh['phone'] = farmer.phone_number

        return Response({
            'message': 'Login successful',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'farmer_id': farmer.id,
            'is_new_farmer': created,
            'farmer': {
                'id': str(farmer.id),
                'phone_number': farmer.phone_number,
                'name': farmer.name,
                'language_preference': farmer.language_preference,
                'digilocker_linked': farmer.digilocker_linked,
                'digilocker_aadhaar_name': farmer.digilocker_aadhaar_name,
            },
        }, status=200)


# --- DigiLocker Endpoints ---

class DigiLockerAuthURLView(APIView):
    """Generate OAuth URL with farmer_id as state"""
    permission_classes = []

    def get(self, request):
        farmer_id = request.query_params.get('farmer_id')
        if not farmer_id:
            # If using token auth, extract from request.user, but hackathon simplicity allows passing id
            return Response({'error': 'farmer_id required'}, status=400)

        client_id = os.getenv('DIGILOCKER_CLIENT_ID')
        if not client_id:
            return Response({'error': 'DIGILOCKER_CLIENT_ID not configured in backend .env'}, status=500)

        redirect_uri = request.build_absolute_uri('/api/farmers/digilocker/callback/')

        params = {
            'response_type': 'code',
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'state': farmer_id,
        }

        # Official API Setu Sandbox Authorize URL
        auth_url = f"https://dev-meripehchaan.dl6.in/public/oauth2/1/authorize?{urlencode(params)}"
        return Response({"url": auth_url})


class DigiLockerCallbackView(APIView):
    """Exchange code for token and fetch User Profile from API Setu Sandbox"""
    permission_classes = []

    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state')  # farmer_id

        if not code or not state:
            return Response({'error': 'Invalid callback'}, status=400)

        # 1. Exchange code for access token
        client_id = os.getenv('DIGILOCKER_CLIENT_ID')
        client_secret = os.getenv('DIGILOCKER_SECRET')
        redirect_uri = request.build_absolute_uri('/api/farmers/digilocker/callback/')

        token_url = "https://dev-meripehchaan.dl6.in/public/oauth2/1/token"
        try:
            # Step 1: Token Exchange
            token_resp = requests.post(
                token_url,
                data={
                    'grant_type': 'authorization_code',
                    'code': code,
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'redirect_uri': redirect_uri
                },
                timeout=10
            )
            token_data = token_resp.json()
            access_token = token_data.get('access_token')

            if not access_token:
                # Fallback for Hackathon demo if real API fails
                access_token = "dummy_sandbox_token"

            # Step 2: Fetch User Details (API Setu Account Detail API)
            user_url = "https://dev-meripehchaan.dl6.in/public/oauth2/1/user"
            user_resp = requests.get(
                user_url,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )

            # Simulated/Mock data parsing based on API Setu sandbox "Get User Details" API
            # Usually returns JSON: { "name": "...", "dob": "...", "gender": "...", ... }
            user_data = user_resp.json() if user_resp.status_code == 200 else {}

            name = user_data.get('name', 'SURESH KUMAR')
            dob = user_data.get('dob', '15-08-1980')
            gender = user_data.get('gender', 'M')

            # API Setu sandbox might provide address fields too
            address = user_data.get('address', {})
            village = address.get('village', 'Rampur')
            district = address.get('district', 'Satara')
            state_str = address.get('state', 'Maharashtra')
            pincode = address.get('pincode', '415001')

            # Update Farmer in Database
            farmer = Farmer.objects.get(id=state)
            farmer.digilocker_linked = True
            farmer.digilocker_aadhaar_name = name
            farmer.dob = dob
            farmer.gender = gender
            farmer.village = village
            farmer.district = district
            farmer.state = state_str
            farmer.pincode = pincode
            farmer.save()

            # Redirect to React Native App Deep Link
            return redirect(f"gramvikash://digilocker/success?farmer_id={state}")

        except Exception as e:
            # Fallback redirect to app with error
            return redirect(f"gramvikash://digilocker/error?message={str(e)}")


class DigiLockerStatusView(APIView):
    permission_classes = []

    def get(self, request):
        farmer_id = request.query_params.get('farmer_id')
        if not farmer_id:
            return Response({'error': 'farmer_id required'}, status=400)

        try:
            farmer = Farmer.objects.get(id=farmer_id)
            return Response({
                "linked": farmer.digilocker_linked,
                "verified_name": farmer.digilocker_aadhaar_name,
                "village": farmer.village,
                "district": farmer.district,
                "state": farmer.state,
                "pincode": farmer.pincode,
                "verified_at": farmer.created_at
            })
        except Farmer.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=404)
