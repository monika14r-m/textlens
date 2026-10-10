# TextLens

TextLens is an open-source document review workspace for students, researchers, and writers. It combines heuristic AI-writing signals, comparison of two supplied texts, document text extraction, and optional AI-assisted editing.

> **Important:** AI-writing estimates are unreliable and must not be treated as proof of authorship or misconduct. Text comparison only compares the two texts provided; it does not search the web or private academic databases. AI revision is intended to improve clarity and correctness, not to disguise authorship or defeat detectors.

## What is included in this upgrade

- A responsive, PDF-tool-inspired Next.js workspace with drag-and-drop upload and paste-in editing.
- PDF, DOCX, TXT, and Markdown extraction, with a 15 MB upload limit. Scanned PDFs that contain only images require OCR and are not supported in this MVP.
- Writing-pattern analysis with sentence-level signals and clearer uncertainty language.
- Pairwise text similarity with exact phrase overlap results.
- AI revision for clarity, grammar, concision, or academic tone through an optional OpenAI-compatible Chat Completions API.
- Improved API error messages, health endpoint, configurable CORS, and input limits.

## Stack

- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python
- Analysis: Transformers / DistilGPT-2 heuristic and scikit-learn TF-IDF similarity
- File extraction: pypdf and python-docx

## Run locally

### 1. Backend

Use Python 3.10 or 3.11 for best compatibility with the pinned PyTorch version.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate` and start the API with the same `uvicorn` command.

AI revision requires an API key. Add it to `backend/.env`:

```dotenv
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
TEXTLENS_CORS_ORIGINS=http://localhost:3000
```

Choose a model that is available to your provider/account. Keep real API keys out of Git and never expose them as `NEXT_PUBLIC_*` variables. Document analysis uses your configured TextLens backend; clicking **Revise with AI** additionally sends the selected text to the AI provider configured by the backend.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. If your backend is hosted elsewhere, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to that backend's base URL and restart Next.js.

## API endpoints

- `GET /` and `GET /health` — service status
- `POST /documents/extract` — multipart document upload; accepts PDF/DOCX/TXT/MD
- `POST /analyze/ai` — probabilistic writing-pattern analysis
- `POST /analyze/similarity` — compares two supplied texts
- `POST /writing/revise` — optional AI-assisted editing; requires a backend API key

FastAPI's interactive API reference is available at `http://localhost:8000/docs` while the backend is running.

## Important limitations

- The current AI score uses statistical heuristics. It is not a calibrated probability, has not been independently validated as a misconduct detector, and can produce false positives and false negatives.
- The similarity score is pairwise TF-IDF cosine similarity, not a plagiarism verdict. Exact phrase matches are only a subset of possible overlap.
- There is no internet-wide originality index, OCR, account system, persistent document history, or cloud file storage in this version.
- The AI revision endpoint sends source text to the configured model provider. Review that provider's data-use terms before using confidential material.
- For production, set `TEXTLENS_CORS_ORIGINS` to your exact frontend domain(s), add request rate limiting/authentication as appropriate, and configure provider quotas. Do not deploy with an unrestricted development CORS setting.

## License

MIT — see the repository license.
