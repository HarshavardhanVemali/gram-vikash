import uuid
from django.db import models
from farmers.models import Farmer


class EmergencyLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='emergencies')
    issue_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    resolved = models.BooleanField(default=False)
    reported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reported_at']

    def __str__(self):
        return f"Emergency {self.issue_type} by {self.farmer.phone_number}"
