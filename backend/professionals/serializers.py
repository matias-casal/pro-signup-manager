from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict

try:
    import magic  # type: ignore
except ImportError:
    magic = None
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework import serializers

from .models import Professional
from .services import ResumeProcessorService


class ProfessionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professional
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "company_name",
            "job_title",
            "source",
            "resume",
            "resume_text",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("resume_text", "created_at", "updated_at")
        extra_kwargs = {
            # Avoid redundant DB uniqueness queries; let ORM constraint + our mapping handle duplicates.
            "email": {"validators": []},
            "phone": {"validators": []},
        }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        email = attrs.get("email") or getattr(self.instance, "email", None)
        phone = attrs.get("phone") or getattr(self.instance, "phone", None)
        if not (email or phone):
            raise serializers.ValidationError(
                {"non_field_errors": "At least one contact method (email or phone) is required."}
            )
        if phone and not re.match(r"^[\d\s()+.-]{7,20}$", phone):
            raise serializers.ValidationError({"phone": "Enter a valid phone number."})
        return attrs

    def validate_resume(self, resume: Any) -> Any:
        """
        Hardened resume validation:
        - enforce 5MB payload limit
        - require .pdf extension plus magic-byte inspection (or signature fallback)
        - reject masqueraded executables that slip past extension checks.
        """
        if not resume:
            return resume
        max_bytes = 5 * 1024 * 1024
        if resume.size > max_bytes:
            raise serializers.ValidationError("File must be 5MB or smaller.")

        ext = Path(resume.name).suffix.lower()
        if ext != ".pdf":
            raise serializers.ValidationError("Only .pdf files are allowed.")

        if magic:
            try:
                header = resume.read(4096)
                resume.seek(0)
                mime_type = magic.from_buffer(header, mime=True) or ""
            except Exception:
                raise serializers.ValidationError("Unable to inspect uploaded file.")
            finally:
                resume.seek(0)

            if mime_type not in ("application/pdf", "application/x-pdf"):
                raise serializers.ValidationError("Uploaded file is not a valid PDF.")
        else:
            # Fallback: assert PDF signature when libmagic not present (dev/test contexts).
            header = resume.read(5)
            resume.seek(0)
            if header != b"%PDF-":
                raise serializers.ValidationError("Uploaded file is not a valid PDF.")
        return resume

    def create(self, validated_data: Dict[str, Any]) -> Professional:
        resume_file = validated_data.get("resume")
        professional = Professional(**validated_data)
        try:
            professional.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        try:
            professional.save()
        except IntegrityError as exc:
            raise serializers.ValidationError(self._map_integrity_error(exc))
        self._process_resume(professional, resume_file)
        return professional

    def update(self, instance: Professional, validated_data: Dict[str, Any]) -> Professional:
        resume_file = validated_data.get("resume", instance.resume)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        try:
            instance.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        try:
            instance.save()
        except IntegrityError as exc:
            raise serializers.ValidationError(self._map_integrity_error(exc))
        # Only process when a new resume is supplied to avoid redundant I/O and writes.
        if "resume" in validated_data:
            self._process_resume(instance, resume_file)
        return instance

    def _process_resume(self, professional: Professional, resume_file: Any) -> None:
        """Extract text immediately so resume_text stays in sync with the stored PDF."""
        if resume_file:
            processor = ResumeProcessorService()
            professional.resume_text = processor.extract_text(professional.resume.path)
            professional.save(update_fields=["resume_text"])

    def _map_integrity_error(self, exc: IntegrityError) -> Dict[str, str]:
        """Translate raw DB integrity errors into field-specific, user-facing messages."""
        message = str(exc).lower()
        if "email" in message:
            return {"email": "A professional with this email already exists."}
        if "phone" in message:
            return {"phone": "A professional with this phone already exists."}
        return {"non_field_errors": "Duplicate detected."}
