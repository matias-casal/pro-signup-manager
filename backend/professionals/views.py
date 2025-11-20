from __future__ import annotations

from typing import Dict, List

from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Professional
from .serializers import ProfessionalSerializer


class ProfessionalViewSet(viewsets.ModelViewSet):
    queryset = Professional.objects.all().order_by("-created_at")
    serializer_class = ProfessionalSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        source = self.request.query_params.get("source")
        if source:
            queryset = queryset.filter(source=source)
        return queryset

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_upsert(self, request):
        """
        Upserts multiple professionals in a single request.

        We preload existing records keyed by email/phone to avoid N+1 lookups,
        validate each row independently, and return HTTP 207 with the per-index
        errors instead of aborting the entire batch.
        """
        if not isinstance(request.data, list):
            return Response({"detail": "Expected a list of professional records."}, status=status.HTTP_400_BAD_REQUEST)

        payload: List[Dict] = request.data
        emails = {item.get("email", "").lower() for item in payload if item.get("email")}
        phones = {item.get("phone") for item in payload if item.get("phone")}

        existing = Professional.objects.filter(Q(email__in=emails) | Q(phone__in=phones))
        lookup: Dict[str, Professional] = {}
        for prof in existing:
            if prof.email:
                lookup[f"email:{prof.email.lower()}"] = prof
            if prof.phone:
                lookup[f"phone:{prof.phone}"] = prof

        errors = []
        success_count = 0

        for idx, entry in enumerate(payload):
            email_key = f"email:{entry.get('email', '').lower()}" if entry.get("email") else None
            phone_key = f"phone:{entry.get('phone')}" if entry.get("phone") else None
            match = lookup.get(email_key) or lookup.get(phone_key)

            serializer = ProfessionalSerializer(instance=match, data=entry, partial=bool(match))
            if not serializer.is_valid():
                errors.append({"index": idx, "errors": serializer.errors})
                continue

            try:
                professional = serializer.save()
            except (ValidationError, DRFValidationError) as exc:
                detail = getattr(exc, "message_dict", getattr(exc, "detail", str(exc)))
                errors.append({"index": idx, "errors": detail})
                continue

            success_count += 1
            if professional.email:
                lookup[f"email:{professional.email.lower()}"] = professional
            if professional.phone:
                lookup[f"phone:{professional.phone}"] = professional

        status_code = status.HTTP_207_MULTI_STATUS if errors else status.HTTP_200_OK
        return Response(
            {
                "total_processed": len(payload),
                "success_count": success_count,
                "errors": errors,
            },
            status=status_code,
        )
