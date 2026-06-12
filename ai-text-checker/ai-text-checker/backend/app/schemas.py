from pydantic import BaseModel
from typing import List


class AIDetectRequest(BaseModel):
    text: str


class AIDetectResponse(BaseModel):
    ai_likelihood: float          # 0-100, higher = more likely AI-generated
    avg_perplexity: float
    burstiness: float
    sentence_scores: List[float]  # per-sentence perplexity, for highlighting
    sentences: List[str]


class SimilarityRequest(BaseModel):
    text_a: str
    text_b: str


class OverlapSpan(BaseModel):
    text: str
    start_a: int
    start_b: int


class SimilarityResponse(BaseModel):
    similarity_score: float       # 0-100, cosine similarity * 100
    overlaps: List[OverlapSpan]
