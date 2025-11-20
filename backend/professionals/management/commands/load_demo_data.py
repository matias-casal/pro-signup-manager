import csv
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import IntegrityError

from professionals.models import Professional, ProfessionalSource
from professionals.serializers import ProfessionalSerializer


class Command(BaseCommand):
    help = "Load demo professionals from CSV for local development. Safe to re-run (upserts)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default=None,
            help="Path to CSV file. Defaults to backend/demo_data/professionals.csv",
        )

    def handle(self, *args, **options):
        """
        Seed the database from CSV in an idempotent way.

        We preload existing records by email/phone to reuse them during the loop,
        allowing the command to be re-run without creating duplicates while still
        honoring updates from the CSV source. Errors are surfaced with row indexes
        to mirror the API bulk endpoint behaviour.
        """
        base_path = Path(__file__).resolve().parent.parent.parent.parent
        csv_path = Path(options["path"]) if options.get("path") else base_path / "demo_data" / "professionals.csv"
        if not csv_path.exists():
            self.stdout.write(self.style.WARNING(f"CSV not found: {csv_path}"))
            return

        rows = list(csv.DictReader(csv_path.open()))
        emails = {row.get("email", "").lower() for row in rows if row.get("email")}
        phones = {row.get("phone") for row in rows if row.get("phone")}

        existing = Professional.objects.filter(email__in=emails) | Professional.objects.filter(phone__in=phones)
        lookup = {}
        for prof in existing:
            if prof.email:
                lookup[f"email:{prof.email.lower()}"] = prof
            if prof.phone:
                lookup[f"phone:{prof.phone}"] = prof

        created = 0
        updated = 0
        errors = []

        for idx, row in enumerate(rows):
            normalized = {
                "full_name": row.get("full_name") or "",
                "email": row.get("email") or None,
                "phone": row.get("phone") or None,
                "company_name": row.get("company_name") or "",
                "job_title": row.get("job_title") or "",
                "source": row.get("source") or ProfessionalSource.DIRECT,
            }
            email_key = f"email:{(normalized['email'] or '').lower()}" if normalized["email"] else None
            phone_key = f"phone:{normalized['phone']}" if normalized["phone"] else None
            instance = lookup.get(email_key) or lookup.get(phone_key)

            serializer = ProfessionalSerializer(instance=instance, data=normalized, partial=bool(instance))
            if not serializer.is_valid():
                errors.append({"row": idx, "errors": serializer.errors})
                continue

            try:
                prof = serializer.save()
            except IntegrityError as exc:  # unlikely due to prefetch but safe
                errors.append({"row": idx, "errors": str(exc)})
                continue

            if instance:
                updated += 1
            else:
                created += 1
            if prof.email:
                lookup[f"email:{prof.email.lower()}"] = prof
            if prof.phone:
                lookup[f"phone:{prof.phone}"] = prof

        self.stdout.write(self.style.SUCCESS(f"Demo data applied: {created} created, {updated} updated"))
        if errors:
            self.stdout.write(self.style.WARNING(f"Errors on {len(errors)} rows: {errors}"))
