"""
app/models_hub/gully2psl.py
────────────────────────────
AI analysis module for the "Gully2PSL" feature.

Analyses cricket performance clips or still images to extract:
  • Bowling speed (the primary sport metric)
  • Action quality score
  • Uniqueness of the captured moment

In production, replace the mock with a pose-estimation or
action-recognition model (e.g. MediaPipe, YOLOv8-Pose, or a
custom cricket action classifier).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

FEATURE_NAME = "Gully2PSL"

MIN_UNIQUENESS_THRESHOLD = 5_000  # 50 %


@dataclass(frozen=True)
class AnalysisResult:
    is_valid: bool
    uniqueness_score: int   # 0–10 000
    bowling_speed: int      # km/h × 100  (e.g. 14500 = 145.00 km/h)
    confidence: float
    reason: str


def analyze(file_bytes: bytes, filename: str) -> AnalysisResult:
    """
    Analyse a Gully2PSL cricket performance asset.

    Bowling speed is the headline metric for this module — it is stored
    on-chain in the FankarNFT.bowlingSpeed mapping.

    Args:
        file_bytes: Raw bytes of the uploaded image / video thumbnail.
        filename:   Original filename.

    Returns:
        AnalysisResult with scores and a pass/fail verdict.
    """
    logger.info(
        "[%s] Analysing file '%s' (%d bytes)...",
        FEATURE_NAME, filename, len(file_bytes),
    )

    # ── Mock AI Analysis ───────────────────────────────────
    # TODO: Replace with real sports-AI inference.
    #
    # Production example:
    #   speed_kmh = cricket_speed_model.predict(file_bytes)  # returns float
    #   bowling_speed = int(speed_kmh * 100)

    bowling_speed    = 14_550  # 145.50 km/h
    uniqueness_score = 9_200   # 92.00 % — rare high-speed delivery captured
    confidence       = 0.95

    is_valid = uniqueness_score >= MIN_UNIQUENESS_THRESHOLD

    reason = (
        f"Gully2PSL asset verified — bowling speed {bowling_speed / 100:.2f} km/h, "
        f"uniqueness {uniqueness_score / 100:.1f}%."
        if is_valid
        else f"Asset rejected — uniqueness {uniqueness_score / 100:.1f}% below threshold."
    )

    logger.info(
        "[%s] Result: is_valid=%s, speed=%d, uniqueness=%d",
        FEATURE_NAME, is_valid, bowling_speed, uniqueness_score,
    )

    return AnalysisResult(
        is_valid=is_valid,
        uniqueness_score=uniqueness_score,
        bowling_speed=bowling_speed,
        confidence=confidence,
        reason=reason,
    )
