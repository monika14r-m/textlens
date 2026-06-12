"""
Similarity / plagiarism check between two texts.

v1 approach:
- TF-IDF + cosine similarity for an overall similarity score.
- N-gram overlap (default 6-word windows) to find and highlight exact
  matching phrases between the two texts.
"""

import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _tokenize_words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def compute_similarity(text_a: str, text_b: str) -> float:
    if not text_a.strip() or not text_b.strip():
        return 0.0

    vectorizer = TfidfVectorizer().fit([text_a, text_b])
    vectors = vectorizer.transform([text_a, text_b])
    score = cosine_similarity(vectors[0], vectors[1])[0][0]
    return round(float(score) * 100, 1)


def find_overlaps(text_a: str, text_b: str, n: int = 6) -> list[dict]:
    """Find matching n-word phrases between two texts."""
    words_a = _tokenize_words(text_a)
    words_b = _tokenize_words(text_b)

    if len(words_a) < n or len(words_b) < n:
        return []

    ngrams_b = {}
    for i in range(len(words_b) - n + 1):
        gram = " ".join(words_b[i:i + n])
        ngrams_b.setdefault(gram, []).append(i)

    overlaps = []
    seen = set()
    for i in range(len(words_a) - n + 1):
        gram = " ".join(words_a[i:i + n])
        if gram in ngrams_b and gram not in seen:
            overlaps.append({
                "text": gram,
                "start_a": i,
                "start_b": ngrams_b[gram][0],
            })
            seen.add(gram)

    return overlaps
