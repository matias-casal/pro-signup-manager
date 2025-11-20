from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from professionals.models import ProfessionalSource
from professionals.services import ResumeProcessorService


@pytest.fixture

def sample_pdf(tmp_path: Path) -> Path:
    # Minimal PDF containing "Hello PDF" text for extraction
    content = b"%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\n3 0 obj<< /Type /Page /Parent 7 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length 44 >>stream\nBT /F1 12 Tf 72 712 Td (Hello PDF) Tj ET\nendstream endobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n6 0 obj<< /Type /Catalog /Pages 7 0 R >>endobj\n7 0 obj<< /Kids [3 0 R] /Count 1 /Type /Pages >>endobj\nxref\n0 8\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000100 00000 n \n0000000223 00000 n \n0000000317 00000 n \n0000000387 00000 n \n0000000463 00000 n \ntrailer<< /Size 8 /Root 6 0 R >>\nstartxref\n537\n%%EOF"
    pdf_path = tmp_path / "sample.pdf"
    pdf_path.write_bytes(content)
    return pdf_path


def test_resume_processor_extracts_text(sample_pdf: Path):
    processor = ResumeProcessorService()
    text = processor.extract_text(str(sample_pdf))
    assert "Hello PDF" in text


@pytest.mark.django_db
def test_create_duplicate_email_fails(client):
    url = "/api/professionals/"
    payload = {"full_name": "Test User", "email": "unique@example.com", "source": ProfessionalSource.DIRECT}
    assert client.post(url, payload, format="json").status_code == 201
    resp = client.post(url, payload, format="json")
    assert resp.status_code == 400
    assert "email" in resp.json()


@pytest.mark.django_db
def test_rejects_malicious_executable_disguised_as_pdf(client):
    url = "/api/professionals/"
    fake_pdf = SimpleUploadedFile(
        "resume.pdf",
        b"MZ" + b"\x00" * 100,  # PE header signature
        content_type="application/octet-stream",
    )
    payload = {"full_name": "Exe User", "email": "exe@example.com", "source": ProfessionalSource.DIRECT, "resume": fake_pdf}
    resp = client.post(url, payload)
    assert resp.status_code == 400
    assert "resume" in resp.json()


@pytest.mark.django_db
def test_rejects_oversized_resume(client):
    url = "/api/professionals/"
    big_content = b"%PDF-1.4\n" + (b"0" * (10 * 1024 * 1024))
    big_pdf = SimpleUploadedFile(
        "big_resume.pdf",
        big_content,
        content_type="application/pdf",
    )
    payload = {"full_name": "Big File", "email": "big@example.com", "source": ProfessionalSource.DIRECT, "resume": big_pdf}
    resp = client.post(url, payload)
    assert resp.status_code == 400
    assert "resume" in resp.json()


@pytest.mark.django_db
def test_invalid_phone_rejected(client):
    url = "/api/professionals/"
    payload = {"full_name": "Bad Phone", "phone": "abc123!!!", "source": ProfessionalSource.DIRECT}
    resp = client.post(url, payload, format="json")
    assert resp.status_code == 400
    assert "phone" in resp.json()
