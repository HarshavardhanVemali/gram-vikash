import uuid
from django.db import models

class MandiPrice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commodity = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    market = models.CharField(max_length=100)
    min_price = models.DecimalField(max_digits=10, decimal_places=2)
    max_price = models.DecimalField(max_digits=10, decimal_places=2)
    modal_price = models.DecimalField(max_digits=10, decimal_places=2)
    arrival_date = models.DateField()

    class Meta:
        ordering = ['-arrival_date', 'commodity']

    def __str__(self):
        return f"{self.commodity} in {self.market} on {self.arrival_date}"
