from typing import Literal

from pydantic import BaseModel, Field


class AIDetectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=150000)


class AIDetectResponse(BaseModel):
    ai_likelihood: float
    avg_perplexity: float
    burstiness: float
    sentence_scores: list[float | None]
    sentences: list[str]
    confidence: float | None = None
    word_count: int | None = None
    document_perplexity: float | None = None
    sentence_length_burstiness: float | None = None
    lexical_diversity: float | None = None
    repetition_score: float | None = None
    warning: str | None = None


class SimilarityRequest(BaseModel):
    text_a: str = Field(min_length=1, max_length=150000)
    text_b: str = Field(min_length=1, max_length=150000)


class OverlapSpan(BaseModel):
    text: str
    start_a: int
    start_b: int


class SimilarityResponse(BaseModel):
    similarity_score: float
    overlaps: list[OverlapSpan]


class DocumentExtractionResponse(BaseModel):
    text: str
    word_count: int
    filename: str


class RevisionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50000)
    goal: Literal["clarity", "grammar", "concise", "academic"] = "clarity"


class RevisionResponse(BaseModel):
    revised_text: str
    notes: str = ""
