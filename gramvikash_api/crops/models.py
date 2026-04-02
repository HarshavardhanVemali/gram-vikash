import uuid
from django.db import models
from farmers.models import Farmer


class CropScan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='crop_scans')
    image_url = models.URLField(max_length=500)

    crop_type = models.CharField(max_length=100, blank=True, null=True)
    disease_name = models.CharField(max_length=200, blank=True, null=True)
    disease_name_local = models.CharField(max_length=250, blank=True, null=True)
    severity = models.CharField(max_length=50, blank=True, null=True)
    confidence_pct = models.IntegerField(default=0)
    cause = models.TextField(blank=True, null=True)
    treatment_steps = models.JSONField(blank=True, null=True, default=list)
    preventive_tip = models.TextField(blank=True, null=True)
    needs_expert = models.BooleanField(default=False)
    image_quality = models.CharField(max_length=50, blank=True, null=True)

    scan_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scan_date']

    def __str__(self):
        return f"{self.crop_type} ({self.disease_name}) - Farmer {self.farmer.phone_number}"
