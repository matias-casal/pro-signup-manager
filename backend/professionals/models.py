from __future__ import annotations

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models

phone_validator = RegexValidator(
    regex=r"^[+0-9\s().-]{7,20}$",
    message="Enter a valid phone number (digits, spaces, +, -, ., parentheses).",
)


class ProfessionalSource(models.TextChoices):
    DIRECT = "direct", "Direct"
    PARTNER = "partner", "Partner"
    INTERNAL = "internal", "Internal"


class Professional(models.Model):
    full_name = models.CharField(max_length=200)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(
        max_length=32, blank=True, null=True, unique=True, validators=[phone_validator]
    )
    company_name = models.CharField(max_length=200, blank=True)
    job_title = models.CharField(max_length=200, blank=True)
    source = models.CharField(
        max_length=50, choices=ProfessionalSource.choices, default=ProfessionalSource.DIRECT, db_index=True
    )
    resume = models.FileField(upload_to="resumes/", blank=True, null=True)
    resume_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["email"], name="idx_prof_email"),
            models.Index(fields=["phone"], name="idx_prof_phone"),
            models.Index(fields=["source"], name="idx_prof_source"),
        ]

    def clean(self):
        if not (self.email or self.phone):
            raise ValidationError("At least one contact method (email or phone) is required.")

    def __str__(self) -> str:  # pragma: no cover
        return self.full_name or self.email or self.phone or "Professional"
