from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import pdfplumber
from pypdf import PdfReader

logger = logging.getLogger(__name__)


class ResumeProcessorService:
    """Handles resume ingestion. Structured for future async/offline use."""

    def __init__(self, *, fallback: bool = True):
        self.fallback = fallback

    def extract_text(self, file_path: str) -> str:
        """
        Extracts text from a PDF, falling back to PyPDF when pdfplumber fails so
        that ingestion continues even on slightly malformed documents.
        """
        path = Path(file_path)
        if not path.exists():
            return ""
        try:
            return self._extract_with_pdfplumber(path)
        except Exception:
            logger.exception("pdfplumber failed; attempting fallback extractor")
            if self.fallback:
                return self._extract_with_pypdf(path)
            return ""

    def _extract_with_pdfplumber(self, path: Path) -> str:
        text_parts = []
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts).strip()

    def _extract_with_pypdf(self, path: Path) -> str:
        text_parts = []
        reader = PdfReader(str(path))
        for page in reader.pages:
            text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts).strip()
