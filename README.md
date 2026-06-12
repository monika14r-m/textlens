# TextLens

A free, open alternative to expensive AI-content & plagiarism detection tools.

## Why
Paid AI-detection and plagiarism checkers are expensive and often locked behind
subscriptions, even for basic use cases like checking your own writing before
submission. TextLens provides a simple, self-hostable tool that gives you:

- **AI-likelihood score** — estimates how likely a piece of text was generated
  by an LLM, using perplexity and burstiness analysis (the same underlying
  signals commercial detectors use, but transparent and open).
- **Similarity / plagiarism check** — compares two texts and highlights
  overlapping or near-duplicate segments.

## Stack
- **Frontend**: Next.js + TypeScript + Tailwind, deployed on Vercel
- **Backend**: FastAPI (Python), deployed on Render
- **Core ML**: Hugging Face `transformers` (GPT-2) for perplexity scoring,
  scikit-learn TF-IDF for similarity

## Repo Structure
```
ai-text-checker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + routes
│   │   ├── ai_detector.py   # perplexity/burstiness scoring
│   │   ├── similarity.py    # TF-IDF similarity & overlap highlighting
│   │   └── schemas.py        # request/response models
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # main UI
│   │   └── layout.tsx
│   ├── components/
│   │   ├── TextInput.tsx
│   │   └── ResultsPanel.tsx
│   ├── lib/api.ts            # API client
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── README.md
```

## How it works (v1)

1. **AI Detection**: text is scored with GPT-2 to compute average token
   perplexity and burstiness (variance in per-sentence perplexity). Lower
   perplexity + lower burstiness → more likely AI-generated. This is the same
   class of signal used by tools like GPTZero.

2. **Similarity check**: two texts are vectorized with TF-IDF and compared
   using cosine similarity; overlapping n-grams (default 6-word windows) are
   highlighted in the UI.

## Roadmap
- [ ] Sentence-level highlighting for AI-likelihood
- [ ] Web-search-based plagiarism check (compare against live web snippets)
- [ ] Support for longer documents / file uploads (PDF, DOCX)
- [ ] Auth + history of past checks
