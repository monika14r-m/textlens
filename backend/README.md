# TextLens Backend

FastAPI service for document extraction, experimental writing-pattern analysis, pairwise text comparison, and optional AI-assisted revision.

## Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate` and copy `.env.example` to `.env`.

## Configuration

- `TEXTLENS_CORS_ORIGINS`: comma-separated frontend origins. Use exact production origins.
- `OPENAI_API_KEY`: optional; enables `POST /writing/revise`.
- `OPENAI_MODEL`: optional; defaults to `gpt-4o-mini`.
- `OPENAI_BASE_URL`: optional OpenAI-compatible API base URL.

Keep keys in backend environment variables; do not expose them through Next.js public variables.

## Endpoints

- `GET /` and `GET /health` — health checks.
- `POST /documents/extract` — PDF, DOCX, TXT, MD extraction (15 MB maximum).
- `POST /analyze/ai` — experimental writing-pattern signals; at least 100 words.
- `POST /analyze/similarity` — compares two supplied texts only.
- `POST /writing/revise` — optional AI editing; requires a server-side API key.

Swagger docs: `http://localhost:8000/docs`.

## Tests

Install test dependencies with `pip install -r requirements-dev.txt`, then run `pytest -q`.
