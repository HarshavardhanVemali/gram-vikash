import uuid
import json
import logging
import os
import tempfile
from io import BytesIO
from PIL import Image

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.cache import cache
from .models import CropScan
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.cache import cache

from core.tasks import upload_file_to_s3
from .tasks import diagnose_crop_task

logger = logging.getLogger(__name__)

class DiagnoseCropView(APIView):
    """
    POST /api/crops/diagnose/
    Accepts multipart form-data with 'image' and optional 'crop_type'.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        image_file = request.FILES.get('image')
        crop_type = request.data.get('crop_type', '')
        
        if not image_file:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        farmer_id = request.user.id
        task_id = str(uuid.uuid4())
        
        try:
            # Pillow Compression (max 800px, JPEG quality 78)
            img = Image.open(image_file)
            
            # Convert to RGB if necessary (e.g. for PNGs with alpha)
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Resize maintaining aspect ratio
            max_size = (800, 800)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save to temporary BytesIO to check size
            output_io = BytesIO()
            img.save(output_io, format='JPEG', quality=78)
            
            compressed_size = output_io.tell()
            if compressed_size > 350 * 1024:
                return Response(
                    {"error": "Image is too complex/large even after compression. Please upload a simpler photo."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save to a physical temp file for S3 upload
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(output_io.getvalue())
                temp_file_path = temp_file.name

        except Exception as e:
            logger.exception("Error processing image with Pillow")
            return Response({"error": "Invalid image file"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Upload to S3
            s3_key = f"crops/{farmer_id}/{task_id}.jpg"
            upload_success = upload_file_to_s3(temp_file_path, s3_key, content_type='image/jpeg')
            
            if not upload_success:
                return Response({"error": "Failed to store image to S3"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            # Initialize Redis status
            redis_key = f"ctask:{task_id}"
            cache.set(redis_key, json.dumps({"status": "pending"}), timeout=600)
            
            # Dispatch Celery Task
            diagnose_crop_task.delay(task_id, s3_key, farmer_id, crop_type, 'hi') # Default language parameter to hi, can be enhanced
            
            return Response({"task_id": task_id}, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.exception("Error initiating crop diagnosis query")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

class CropDiagnoseResultView(APIView):
    """
    GET /api/crops/result/<task_id>/
    Polls the processing status of the crop diagnosis task.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id, *args, **kwargs):
        redis_key = f"ctask:{task_id}"
        cached_data = cache.get(redis_key)
        
        if not cached_data:
            return Response({"status": "error", "message": "Task not found or expired"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            result_dict = json.loads(cached_data)
            return Response(result_dict, status=status.HTTP_200_OK)
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid cache data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SaveCropReportView(APIView):
    """
    POST /api/crops/save-report/
    Saves a crop diagnosis or lab report directly into the database.
    Used by the mobile app's local Gemini integration.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data
        farmer_id = request.user.id
        
        try:
            # Create a CropScan record with the results
            scan = CropScan.objects.create(
                farmer_id=farmer_id,
                crop_type=data.get('type', 'UNKNOWN'),
                disease_name=data.get('diseaseName', 'Unknown'),
                disease_name_local=data.get('diseaseName', 'Unknown'),
                severity=data.get('severity', 'Unknown'),
                confidence_pct=data.get('severityPercentage', 0),
                treatment_steps=data.get('treatments', []),
                image_url=data.get('imageUri', ''), # Optional: If the app uploads it elsewhere
                needs_expert=False
            )
            return Response({"status": "success", "scan_id": str(scan.id)}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.exception("Error saving crop report")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
