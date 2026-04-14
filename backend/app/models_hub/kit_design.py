"""
app/models_hub/kit_design.py
─────────────────────────────
AI analysis module for the "Kit Design" feature.

Evaluates cricket / sports kit artwork for:
  • Design uniqueness and originality
  • Colour palette richness
  • Brand-fit score

In production, swap the mock logic for calls to a real vision model
(e.g. OpenAI Vision, Replicate, or a fine-tuned ResNet on kit imagery).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

FEATURE_NAME = "Kit Design"

# Minimum uniqueness score required to pass validation (0–10 000)
MIN_UNIQUENESS_THRESHOLD = 5_000  # 50 %


@dataclass(frozen=True)
class AnalysisResult:
    is_valid: bool
    uniqueness_score: int   # 0–10 000  (e.g. 8500 = 85.00 %)
    bowling_speed: int      # 0 for non-cricket assets; km/h × 100 otherwise
    confidence: float       # 0.0–1.0 model confidence
    reason: str             # Human-readable verdict


def analyze(file_bytes: bytes, filename: str) -> AnalysisResult:
    """
    Analyse a kit design asset.

    Args:
        file_bytes: Raw bytes of the uploaded image file.
        filename:   Original filename (used for format hints).

    Returns:
        AnalysisResult with scores and a pass/fail verdict.
    """
    logger.info(
        "[%s] Analysing file '%s' (%d bytes)...",
        FEATURE_NAME, filename, len(file_bytes),
    )

    # ── Mock AI Analysis ───────────────────────────────────
    # TODO: Replace with real vision model inference.
    #
    # Example production replacement:
    #   response = openai.chat.completions.create(
    #       model="gpt-4o",
    #       messages=[{"role": "user", "content": [...image_content...]}]
    #   )
    #   uniqueness_score = parse_score(response)

    uniqueness_score = 9_000   # 90.00 % — fixed for fast local testing
    bowling_speed    = 0       # Not applicable for kit designs
    confidence       = 0.97

    is_valid = uniqueness_score >= MIN_UNIQUENESS_THRESHOLD

    reason = (
        f"Kit design passed validation with {uniqueness_score / 100:.1f}% uniqueness score."
        if is_valid
        else f"Kit design rejected — uniqueness score {uniqueness_score / 100:.1f}% "
             f"is below the minimum threshold of {MIN_UNIQUENESS_THRESHOLD / 100:.1f}%."
    )

    logger.info("[%s] Result: is_valid=%s, uniqueness=%d", FEATURE_NAME, is_valid, uniqueness_score)

    return AnalysisResult(
        is_valid=is_valid,
        uniqueness_score=uniqueness_score,
        bowling_speed=bowling_speed,
        confidence=confidence,
        reason=reason,
    )
