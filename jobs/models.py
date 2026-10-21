
from django.db import models
from django.contrib.auth.models import User


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ('Applied', 'Applied'),
        ('Assessment', 'Assessment'),
        ('Interview', 'Interview'),
        ('Offer', 'Offer'),
        ('Rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='job_applications',
        null=True,
        blank=True
    )

    company_name = models.CharField(max_length=100)
    job_role = models.CharField(max_length=100)
    job_location = models.CharField(max_length=100)
    application_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Applied'
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.job_role} at {self.company_name}"
