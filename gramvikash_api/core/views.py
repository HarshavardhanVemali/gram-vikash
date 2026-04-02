import uuid
import json
import logging
import os
import tempfile
import requests
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.cache import cache

from .tasks import process_voice, upload_file_to_s3

logger = logging.getLogger(__name__)


class VoiceQueryView(APIView):
    """
    POST /api/voice/query/
    Accepts multipart form-data with 'audio_file' and 'context' (JSON string).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        audio_file = request.FILES.get('audio_file')
        context_str = request.data.get('context', '{}')

        if not audio_file:
            return Response({"error": "No audio_file provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            context_dict = json.loads(context_str)
        except json.JSONDecodeError:
            context_dict = {}

        farmer_id = request.user.id
        task_id = str(uuid.uuid4())

        # Save uploaded file temporarily to upload to S3
        with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as temp_file:
            for chunk in audio_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name

        try:
            # Upload initial input to S3
            s3_key = f"voice/input/{farmer_id}/{task_id}.ogg"
            upload_success = upload_file_to_s3(temp_file_path, s3_key, content_type=audio_file.content_type)

            if not upload_success:
                return Response({"error": "Failed to store audio to S3"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Initialize Redis status
            redis_key = f"vtask:{task_id}"
            cache.set(redis_key, json.dumps({"status": "pending"}), timeout=600)

            # Dispatch Celery Task
            process_voice.delay(task_id, s3_key, farmer_id, context_dict)

            return Response({"task_id": task_id}, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.exception("Error initiating voice query")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)


class VoiceResultView(APIView):
    """
    GET /api/voice/result/<task_id>/
    Polls the processing status of the voice AI task.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id, *args, **kwargs):
        redis_key = f"vtask:{task_id}"
        cached_data = cache.get(redis_key)

        if not cached_data:
            return Response({"status": "error", "message": "Task not found or expired"},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            result_dict = json.loads(cached_data)
            return Response(result_dict, status=status.HTTP_200_OK)
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid cache data"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TriggerCallView(APIView):
    """
    POST /api/call/trigger/
    Triggers an outbound call to the user's phone number.
    The call flow in Exotel should be configured to use the Voicebot applet.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        phone_number = request.user.username  # Assuming username is the phone number
        if not phone_number.startswith('+'):
            # Basic normalization for Indian numbers if needed
            if len(phone_number) == 10:
                phone_number = '+91' + phone_number

        exotel_sid = os.getenv('EXOTEL_SID')
        exotel_api_key = os.getenv('EXOTEL_API_KEY')
        exotel_api_token = os.getenv('EXOTEL_API_TOKEN')
        exotel_from_number = os.getenv('EXOTEL_FROM_NUMBER')
        exotel_app_id = "1191455"  # GramVikash Flow ID

        if not all([exotel_sid, exotel_api_key, exotel_api_token, exotel_from_number]):
            return Response({"error": "Exotel credentials not configured"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        url = f"https://api.exotel.com/v1/Accounts/{exotel_sid}/Calls/connect.json"

        payload = {
            'From': phone_number,
            'CallerId': exotel_from_number,
            'Url': f"http://my.exotel.com/{exotel_sid}/examl/start/{exotel_app_id}",
            'CallType': 'transcribe'  # Or 'pstn' based on Exotel setup
        }

        try:
            response = requests.post(
                url,
                auth=(exotel_api_key, exotel_api_token),
                data=payload
            )

            if response.status_code == 200:
                return Response({"message": "Call initiated successfully", "sid": response.json().get(
                    'Call', {}).get('Sid')}, status=status.HTTP_200_OK)
            else:
                logger.error(f"Exotel Call Error: {response.status_code} {response.text}")
                return Response({"error": f"Failed to initiate call: {response.text}"},
                                status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.exception("Error triggering Exotel call")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
