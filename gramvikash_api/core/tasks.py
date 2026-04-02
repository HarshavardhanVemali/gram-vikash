import os
import json
import logging
import tempfile
import boto3
from botocore.exceptions import NoCredentialsError
from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from gtts import gTTS
import langdetect
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Initialize AWS S3 Client
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_S3_REGION_NAME
)
BUCKET_NAME = settings.AWS_STORAGE_BUCKET_NAME

# Initialize Gemini Client
# Assumes EXPO_PUBLIC_GEMINI_API_KEY is available in the environment from loading .env
gemini_api_key = os.getenv('EXPO_PUBLIC_GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
ai_client = genai.Client(api_key=gemini_api_key)


def upload_file_to_s3(file_path, s3_key, content_type='audio/mpeg'):
    try:
        s3_client.upload_file(
            file_path, BUCKET_NAME, s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        return True
    except NoCredentialsError:
        logger.error("AWS credentials not available")
        return False
    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")
        return False


def get_presigned_url(s3_key, expiration=3600):
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return response
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return None


def detect_language_code(text):
    """Detect language and map to gTTS supported code, default to hi (Hindi)"""
    try:
        lang = langdetect.detect(text)
        # Handle some common mappings if necessary, langdetect and gTTS generally align well
        # default to hindi if uncertain
        return lang if lang in ['hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml', 'en', 'ur'] else 'hi'
    except Exception:
        return 'hi'  # default fallback


@shared_task
def process_voice(task_id, s3_key, farmer_id, context_dict):
    """
    Background job to process voice audio using Gemini, determine intent,
    generate response, and convert to TTS.
    """
    logger.info(f"Starting voice task: {task_id} for farmer: {farmer_id}")

    redis_key = f"vtask:{task_id}"
    cache.set(redis_key, json.dumps({"status": "processing"}), timeout=600)

    with tempfile.TemporaryDirectory() as temp_dir:
        input_audio_path = os.path.join(temp_dir, f"input_{task_id}.ogg")
        output_audio_path = os.path.join(temp_dir, f"output_{task_id}.mp3")

        try:
            # 1. Download Input Audio from S3
            logger.info(f"Downloading {s3_key} from S3...")
            s3_client.download_file(BUCKET_NAME, s3_key, input_audio_path)

            # 2. Call Gemini
            logger.info("Calling Gemini 1.5 Flash...")
            with open(input_audio_path, 'rb') as f:
                audio_bytes = f.read()

            # Ensure we send the correct mime type, assuming webm/ogg or m4a based on expo-av
            audio_part = types.Part.from_bytes(
                data=audio_bytes,
                mime_type='audio/mp4'  # Or audio/webm depending on what we record as
            )

            prompt = f"""
            You are HUMBOLO, a friendly, expert agricultural AI assistant in India.
            Listen to the user's voice message.

            1. Transcribe the audio exactly.
            2. Detect the farmer's primary intent. It MUST be EXACTLY ONE of the following: "crops", "weather", "schemes", "market", "emergency", "neutral".
            3. Generate a helpful response of MAXIMUM 55 WORDS. It must be actionable and end with a follow-up question.
            4. The response MUST BE TRANSLATED to the identical language and dialect the farmer spoke in.

            Context details (Current Screen: {context_dict.get('screen')}).

            Return ONLY a valid JSON object with EXACTLY these three keys:
            {{
                "transcript": "...",
                "intent": "...",
                "response": "..."
            }}
            Do not include markdown blocks or any other text.
            """

            response = ai_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[audio_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )

            # Parse Gemini Output
            try:
                result_data = json.loads(response.text)
                transcript = result_data.get("transcript", "")
                intent = result_data.get("intent", "neutral")
                ai_response_text = result_data.get("response", "main samajh nahi paya, dobara bolein?")
            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini JSON output")
                transcript = "Audio unclear"
                intent = "neutral"
                ai_response_text = response.text[:55]  # fallback

            # 3. Detect Language and Generate TTS (gTTS)
            logger.info("Generating TTS...")
            lang_code = detect_language_code(ai_response_text)
            tts = gTTS(text=ai_response_text, lang=lang_code, slow=False)
            tts.save(output_audio_path)

            # 4. Upload Output Audio to S3
            output_s3_key = f"voice/output/{farmer_id}/{task_id}.mp3"
            logger.info(f"Uploading TTS to S3: {output_s3_key}")
            upload_success = upload_file_to_s3(output_audio_path, output_s3_key)

            if not upload_success:
                raise Exception("Failed to upload TTS audio to S3")

            # 5. Generate Presigned URL
            audio_url = get_presigned_url(output_s3_key)

            # 6. Mark Task Done in Redis
            final_result = {
                "status": "done",
                "transcript": transcript,
                "response_text": ai_response_text,
                "intent": intent,
                "audio_url": audio_url
            }
            cache.set(redis_key, json.dumps(final_result), timeout=3600)  # Cache for 1 hour
            logger.info(f"Task {task_id} complete.")

        except Exception as e:
            logger.exception(f"Error processing voice task {task_id}: {e}")
            error_result = {
                "status": "error",
                "message": str(e)
            }
            cache.set(redis_key, json.dumps(error_result), timeout=600)
