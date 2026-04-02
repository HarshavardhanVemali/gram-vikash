import os
import json
import logging
import tempfile
import boto3
from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from gtts import gTTS
import langdetect
from google import genai
from google.genai import types

from core.tasks import upload_file_to_s3, get_presigned_url
from farmers.models import Farmer
from .models import CropScan

logger = logging.getLogger(__name__)

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_S3_REGION_NAME
)
BUCKET_NAME = settings.AWS_STORAGE_BUCKET_NAME

gemini_api_key = os.getenv('EXPO_PUBLIC_GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
ai_client = genai.Client(api_key=gemini_api_key)


def detect_language_code(text):
    try:
        lang = langdetect.detect(text)
        return lang if lang in ['hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml', 'en', 'ur'] else 'hi'
    except Exception:
        return 'hi'  # default fallback


@shared_task
def diagnose_crop_task(task_id, s3_key, farmer_id, crop_type_hint, language_code_hint='hi'):
    """
    Background job to diagnose crop disease using Gemini Vision.
    """
    logger.info(f"Starting crop diagnosis task: {task_id} for farmer: {farmer_id}")

    redis_key = f"ctask:{task_id}"
    cache.set(redis_key, json.dumps({"status": "processing"}), timeout=600)

    with tempfile.TemporaryDirectory() as temp_dir:
        input_image_path = os.path.join(temp_dir, f"input_{task_id}.jpg")
        output_audio_path = os.path.join(temp_dir, f"output_{task_id}.mp3")

        try:
            # 1. Download Input Image from S3
            logger.info(f"Downloading {s3_key} from S3...")
            s3_client.download_file(BUCKET_NAME, s3_key, input_image_path)

            # 2. Call Gemini Vision
            logger.info("Calling Gemini 1.5 Flash (Vision)...")
            with open(input_image_path, 'rb') as f:
                image_bytes = f.read()

            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type='image/jpeg'
            )

            prompt = f"""
            You are FASALDOC, an expert agricultural AI assistant and plant pathologist.
            Analyze this image of a {(crop_type_hint if crop_type_hint else 'crop')}.

            Identify any disease, pest, or nutrient deficiency.

            Provide the response STRICTLY as a JSON object matching this exact schema:
            {{
              "crop_type": "Identified crop name in English",
              "disease_name": "Scientific/Common name in English or 'Healthy'",
              "disease_name_local": "Name of disease in {language_code_hint} language",
              "severity": "Must be exactly 'low', 'medium', or 'high'",
              "confidence_pct": integer between 0 and 100,
              "cause": "One descriptive sentence explaining the cause, translated to {language_code_hint}",
              "treatment_steps": ["Step 1 in {language_code_hint}", "Step 2 in {language_code_hint}", "Step 3 in {language_code_hint}"],
              "preventive_tip": "One preventive tip translated to {language_code_hint}",
              "needs_expert": boolean (true if highly contagious, deadly, or requires chemical handling),
              "image_quality": "Must be exactly 'good', 'unclear', or 'not_a_crop'"
            }}
            Do not include any markdown blocks around the JSON. Return only the JSON string.
            """

            response = ai_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )

            # Parse Gemini Output
            try:
                result_data = json.loads(response.text)

                # Check for bad imagery
                if result_data.get('image_quality') in ['unclear', 'not_a_crop']:
                    final_result = {
                        "status": "done",
                        "image_quality": result_data.get('image_quality'),
                        "error_message": "Image is unclear or not a plant. Please take a clearer photo."
                    }
                    cache.set(redis_key, json.dumps(final_result), timeout=3600)
                    return

                # Retrieve Farmer
                farmer = Farmer.objects.get(id=farmer_id)

                # 3. Save to database
                db_scan = CropScan.objects.create(
                    id=task_id,  # Link UUID
                    farmer=farmer,
                    image_url=get_presigned_url(s3_key),  # Get temp URL for DB viewing
                    crop_type=result_data.get('crop_type', ''),
                    disease_name=result_data.get('disease_name', ''),
                    disease_name_local=result_data.get('disease_name_local', ''),
                    severity=result_data.get('severity', 'low'),
                    confidence_pct=result_data.get('confidence_pct', 0),
                    cause=result_data.get('cause', ''),
                    treatment_steps=result_data.get('treatment_steps', []),
                    preventive_tip=result_data.get('preventive_tip', ''),
                    needs_expert=result_data.get('needs_expert', False),
                    image_quality=result_data.get('image_quality', 'good')
                )

                # 4. Generate TTS Audio Summary
                logger.info("Generating FASALDOC TTS summary...")
                disease_local = result_data.get('disease_name_local', '')
                treatment_short = ""
                if result_data.get('treatment_steps'):
                    treatment_short = result_data['treatment_steps'][0]

                if result_data.get('disease_name') == 'Healthy':
                    ai_response_text = "Aapki fasal swasth lag rahi hai!"
                else:
                    ai_response_text = f"Mausambi mein {disease_local} hone ki sambhavna hai. {treatment_short}"

                # Dynamic translation detection to ensure audio matches output text
                lang_code = detect_language_code(ai_response_text)
                tts = gTTS(text=ai_response_text, lang=lang_code, slow=False)
                tts.save(output_audio_path)

                # Upload Output Audio to S3
                output_s3_key = f"voice/output/crops/{farmer_id}/{task_id}.mp3"
                logger.info(f"Uploading TTS to S3: {output_s3_key}")
                upload_success = upload_file_to_s3(output_audio_path, output_s3_key)

                if not upload_success:
                    logger.error("Failed to upload TTS audio to S3, proceeding without voice.")
                    audio_url = None
                else:
                    audio_url = get_presigned_url(output_s3_key)

                # 5. Mark Task Done in Redis
                result_data['status'] = 'done'
                result_data['audio_url'] = audio_url
                result_data['s3_image_url'] = db_scan.image_url  # Optional for frontend display

                cache.set(redis_key, json.dumps(result_data), timeout=3600)  # Cache for 1 hour
                logger.info(f"Crop task {task_id} complete.")

            except json.JSONDecodeError:
                raise Exception("Failed to parse Gemini JSON output")

        except Exception as e:
            logger.exception(f"Error processing crop task {task_id}: {e}")
            error_result = {
                "status": "error",
                "message": str(e)
            }
            cache.set(redis_key, json.dumps(error_result), timeout=600)
