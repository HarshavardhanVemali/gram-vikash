import uuid
from django.db import models


class DistrictContact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    district_name = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)

    class Meta:
        ordering = ['district_name']

    def __str__(self):
        return self.district_name
