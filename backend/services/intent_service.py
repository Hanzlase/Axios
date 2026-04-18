from __future__ import annotations

import re

# Keyword sets per intent
_PATTERNS: dict[str, list[str]] = {
    "quiz": ["quiz", "test me", "mcq", "questions about", "examine", "assess", "question on"],
    "flashcards": ["flashcard", "flash card", "memorize", "key terms", "term", "cards for", "make cards"],
    "plan": ["study plan", "schedule", "roadmap", "plan for", "how many days", "week plan", "syllabus"],
    "explain": ["explain", "what is", "what are", "how does", "how do", "describe", "tell me about", "define"],
    "summarize": ["summarize", "summary", "tldr", "brief overview", "key points", "give me an overview"],
}

_DEFAULT = "chat"


def classify_intent(message: str) -> str:
    """Return the most likely intent for a user message using keyword matching."""
    lower = message.lower()
    scores: dict[str, int] = {intent: 0 for intent in _PATTERNS}
    for intent, keywords in _PATTERNS.items():
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", lower):
                scores[intent] += 1
    best_intent = max(scores, key=lambda k: scores[k])
    return best_intent if scores[best_intent] > 0 else _DEFAULT
