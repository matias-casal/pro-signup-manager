import pytest
from rest_framework.test import APIClient

from professionals.models import Professional, ProfessionalSource


@pytest.mark.django_db
def test_bulk_upsert_partial_success():
    client = APIClient()
    existing = Professional.objects.create(
        email="existing@example.com",
        full_name="Old Name",
        source=ProfessionalSource.DIRECT,
    )

    payload = [
        {
            "email": "new@example.com",
            "full_name": "New User",
            "job_title": "Analyst",
            "source": ProfessionalSource.PARTNER,
        },
        {
            "email": "existing@example.com",
            "full_name": "Updated Name",
            "source": ProfessionalSource.INTERNAL,
        },
        {"source": ProfessionalSource.DIRECT},
    ]

    response = client.post("/api/professionals/bulk/", payload, format="json")
    assert response.status_code == 207
    body = response.json()

    assert body["total_processed"] == 3
    assert body["success_count"] == 2
    assert len(body["errors"]) == 1
    assert body["errors"][0]["index"] == 2

    existing.refresh_from_db()
    assert existing.full_name == "Updated Name"
    assert existing.source == ProfessionalSource.INTERNAL
    assert Professional.objects.filter(email="new@example.com").exists()


@pytest.mark.django_db
def test_bulk_upsert_deduplicates_prefetched_records():
    client = APIClient()
    Professional.objects.create(email="dupe@example.com", full_name="Original")

    payload = [
        {"email": "dupe@example.com", "full_name": "Changed", "job_title": "A"},
        {"email": "dupe@example.com", "full_name": "Second Change", "company_name": "B"},
    ]

    response = client.post("/api/professionals/bulk/", payload, format="json")
    assert response.status_code == 200
    assert response.json()["success_count"] == 2

    prof = Professional.objects.get(email="dupe@example.com")
    assert prof.full_name == "Second Change"
    assert prof.company_name == "B"


@pytest.mark.django_db
def test_bulk_upsert_updates_existing():
    client = APIClient()
    Professional.objects.create(email="edit@example.com", full_name="Old", source=ProfessionalSource.DIRECT)

    payload = [{"email": "edit@example.com", "full_name": "NewName", "source": ProfessionalSource.INTERNAL}]
    response = client.post("/api/professionals/bulk/", payload, format="json")

    assert response.status_code == 200
    body = response.json()
    assert body["success_count"] == 1
    assert not body["errors"]
    assert Professional.objects.count() == 1
    prof = Professional.objects.get(email="edit@example.com")
    assert prof.full_name == "NewName"
