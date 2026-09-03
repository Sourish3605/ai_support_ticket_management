"""
Milestone 2 — Sentiment Agent.
Analyzes customer message text to detect tone, frustration level, and emotional polarity.
Outputs:
  - sentiment: 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'HIGHLY_FRUSTRATED'
  - sentiment_score: float between -1.0 (extremely negative/frustrated) and +1.0 (positive)
  - confidence: float between 0.0 and 1.0
"""

import re
import time


HIGHLY_FRUSTRATED_INDICATORS = [
    "ridiculous", "unacceptable", "terrible", "horrible", "worst", "furious",
    "scam", "lawsuit", "sue", "stolen", "deducted twice", "charged twice",
    "charged multiple", "money stolen", "wasted my time", "disgusted", "appalled",
    "still not working", "urgently need", "disaster", "emergency", "broken for days",
    "completely down", "data missing", "catastrophic", "escalate immediately"
]

NEGATIVE_INDICATORS = [
    "error", "failed", "failure", "cannot", "can't", "unable", "crash", "crashed",
    "crashing", "freeze", "locked", "bug", "broken", "issue", "problem", "not working",
    "slow", "latency", "timeout", "wrong", "missing", "delay", "declined", "unauthorized",
    "bad", "trouble", "fail", "glitch", "hack", "interrupted", "down"
]

POSITIVE_INDICATORS = [
    "thank", "thanks", "great", "excellent", "awesome", "helpful", "appreciate",
    "wonderful", "love", "feature request", "suggestion", "enhancement", "good",
    "like to request", "would be nice", "pleased", "kudos"
]


def analyze_sentiment(text: str) -> dict:
    """
    Analyzes ticket text to return sentiment label, score, and confidence.
    """
    start_time = time.time()
    clean_text = (text or "").lower()
    
    # Check punctuation intensity (multiple exclamation or question marks)
    exclamation_count = clean_text.count("!")
    all_caps_words = [w for w in (text or "").split() if w.isupper() and len(w) > 2]

    # Calculate weighted matches
    hf_matches = [p for p in HIGHLY_FRUSTRATED_INDICATORS if p in clean_text]
    neg_matches = [w for w in NEGATIVE_INDICATORS if re.search(rf"\b{re.escape(w)}\b", clean_text)]
    pos_matches = [w for w in POSITIVE_INDICATORS if re.search(rf"\b{re.escape(w)}\b", clean_text)]

    # Scoring algorithm
    neg_points = len(hf_matches) * 2.5 + len(neg_matches) * 1.0
    if exclamation_count >= 2:
        neg_points += 1.0
    if len(all_caps_words) >= 2:
        neg_points += 1.5

    pos_points = len(pos_matches) * 1.5

    if hf_matches or neg_points >= 4.0:
        sentiment = "HIGHLY_FRUSTRATED"
        score = -0.85 - min(0.15, len(hf_matches) * 0.05)
        confidence = 0.94
    elif neg_points > pos_points and neg_points >= 1.0:
        sentiment = "NEGATIVE"
        score = max(-0.80, -0.30 - (neg_points * 0.15))
        confidence = 0.90
    elif pos_points > neg_points and pos_points >= 1.0:
        sentiment = "POSITIVE"
        score = min(0.95, 0.40 + (pos_points * 0.15))
        confidence = 0.88
    else:
        sentiment = "NEUTRAL"
        score = 0.0
        confidence = 0.85

    latency_ms = max(5, int((time.time() - start_time) * 1000))

    return {
        "status": "SUCCESS",
        "agent_name": "Sentiment Agent",
        "sentiment": sentiment,
        "sentiment_score": round(score, 2),
        "confidence": confidence,
        "frustration_level": "HIGH" if sentiment == "HIGHLY_FRUSTRATED" else ("MEDIUM" if sentiment == "NEGATIVE" else "LOW"),
        "latency_ms": latency_ms,
        "indicators": {
            "highly_frustrated_cues": hf_matches[:3],
            "negative_cues": neg_matches[:4],
            "positive_cues": pos_matches[:3],
        }
    }
