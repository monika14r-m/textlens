"""
AI-text likelihood detector based on perplexity & burstiness.

Core idea (same family of signal used by tools like GPTZero):
- Perplexity: how "surprised" a language model is by the text. Human writing
  tends to have higher, more variable perplexity than LLM-generated text,
  which tends to be more uniformly "predictable" to the model.
- Burstiness: the variance of per-sentence perplexity. Human writing has
  bursts of complexity/simplicity; AI writing tends to be more uniform.

This is a heuristic, not a ground-truth classifier — it should be presented
as an estimate, not a verdict.
"""

import math
import re
import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

_MODEL_NAME = "gpt2"
_tokenizer = None
_model = None


def _load_model():
    global _tokenizer, _model
    if _model is None:
        _tokenizer = GPT2TokenizerFast.from_pretrained(_MODEL_NAME)
        _model = GPT2LMHeadModel.from_pretrained(_MODEL_NAME)
        _model.eval()
    return _tokenizer, _model


def split_sentences(text: str) -> list[str]:
    # Simple sentence splitter (avoids extra nltk download requirement)
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in sentences if s.strip()]


def sentence_perplexity(sentence: str) -> float:
    tokenizer, model = _load_model()
    encodings = tokenizer(sentence, return_tensors="pt")
    input_ids = encodings.input_ids

    if input_ids.shape[1] < 2:
        return 0.0

    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)
        loss = outputs.loss

    return math.exp(loss.item())


def analyze_text(text: str) -> dict:
    sentences = split_sentences(text)
    if not sentences:
        return {
            "ai_likelihood": 0.0,
            "avg_perplexity": 0.0,
            "burstiness": 0.0,
            "sentence_scores": [],
            "sentences": [],
        }

    scores = [sentence_perplexity(s) for s in sentences]
    avg_perplexity = sum(scores) / len(scores)

    mean = avg_perplexity
    variance = sum((s - mean) ** 2 for s in scores) / len(scores)
    burstiness = math.sqrt(variance)

    # Heuristic mapping to a 0-100 "AI likelihood" score.
    # Lower perplexity AND lower burstiness => higher AI likelihood.
    # These thresholds are rough starting points and should be tuned
    # against labeled samples.
    perplexity_score = max(0.0, min(100.0, (60 - avg_perplexity) / 60 * 100))
    burstiness_score = max(0.0, min(100.0, (20 - burstiness) / 20 * 100))

    ai_likelihood = round(0.6 * perplexity_score + 0.4 * burstiness_score, 1)
    ai_likelihood = max(0.0, min(100.0, ai_likelihood))

    return {
        "ai_likelihood": ai_likelihood,
        "avg_perplexity": round(avg_perplexity, 2),
        "burstiness": round(burstiness, 2),
        "sentence_scores": [round(s, 2) for s in scores],
        "sentences": sentences,
    }
