# TextLens Backend

FastAPI service providing AI-text detection and similarity/plagiarism checks.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

## Endpoints

### `POST /analyze/ai`
Request:
```json
{ "text": "Your text here..." }
```
Response:
```json
{
  "ai_likelihood": 72.3,
  "avg_perplexity": 18.4,
  "burstiness": 6.2,
  "sentence_scores": [12.1, 20.5, ...],
  "sentences": ["Sentence one.", "Sentence two."]
}
```

### `POST /analyze/similarity`
Request:
```json
{ "text_a": "...", "text_b": "..." }
```
Response:
```json
{
  "similarity_score": 64.5,
  "overlaps": [
    { "text": "the quick brown fox jumps over", "start_a": 3, "start_b": 10 }
  ]
}
```

## Notes
- First request will download the GPT-2 model (~500MB) — this can be slow
  on free-tier hosting. Consider using `distilgpt2` for faster cold starts.
- Perplexity-based AI detection is a heuristic, not a definitive classifier.
  Present results as estimates.
