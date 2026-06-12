from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    AIDetectRequest,
    AIDetectResponse,
    SimilarityRequest,
    SimilarityResponse,
    OverlapSpan,
)
from app.ai_detector import analyze_text
from app.similarity import compute_similarity, find_overlaps

app = FastAPI(title="TextLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "TextLens API"}


@app.post("/analyze/ai", response_model=AIDetectResponse)
def analyze_ai(req: AIDetectRequest):
    result = analyze_text(req.text)
    return AIDetectResponse(**result)


@app.post("/analyze/similarity", response_model=SimilarityResponse)
def analyze_similarity(req: SimilarityRequest):
    score = compute_similarity(req.text_a, req.text_b)
    overlaps = find_overlaps(req.text_a, req.text_b)
    return SimilarityResponse(
        similarity_score=score,
        overlaps=[OverlapSpan(**o) for o in overlaps],
    )
