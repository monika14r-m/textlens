import math
import re
from collections import Counter

import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

_MODEL_NAME = "distilgpt2"

_tokenizer = None
_model = None

MIN_WORDS = 100


def _load_model():
    global _tokenizer, _model

    if _model is None:
        _tokenizer = GPT2TokenizerFast.from_pretrained(_MODEL_NAME)
        _model = GPT2LMHeadModel.from_pretrained(_MODEL_NAME)
        _model.eval()

    return _tokenizer, _model


def split_sentences(text: str) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in sentences if s.strip()]


def lexical_diversity(text: str) -> float:
    words = re.findall(r"\b\w+\b", text.lower())

    if not words:
        return 0.0

    return len(set(words)) / len(words)


def repetition_score(text: str) -> float:
    words = re.findall(r"\b\w+\b", text.lower())

    if not words:
        return 0.0

    counts = Counter(words)
    repeated = sum(v for v in counts.values() if v > 1)

    return repeated / len(words)


def sentence_length_burstiness(sentences):
    lengths = [len(s.split()) for s in sentences]

    if not lengths:
        return 0.0

    mean = sum(lengths) / len(lengths)

    variance = sum(
        (x - mean) ** 2
        for x in lengths
    ) / len(lengths)

    return math.sqrt(variance)


def sentence_perplexity(sentence: str) -> float:
    tokenizer, model = _load_model()

    encodings = tokenizer(
        sentence,
        return_tensors="pt"
    )

    input_ids = encodings.input_ids

    if input_ids.shape[1] < 2:
        return 0.0

    with torch.no_grad():
        outputs = model(
            input_ids,
            labels=input_ids
        )

    return math.exp(outputs.loss.item())


def document_perplexity(text: str) -> float:
    tokenizer, model = _load_model()

    encodings = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=1024
    )

    with torch.no_grad():
        outputs = model(
            encodings.input_ids,
            labels=encodings.input_ids
        )

    return math.exp(outputs.loss.item())


def analyze_text(text: str) -> dict:
    word_count = len(text.split())

    if word_count < MIN_WORDS:
        return {
            "error": "Text too short for reliable analysis",
            "word_count": word_count,
            "minimum_required": MIN_WORDS,
        }

    sentences = split_sentences(text)

    if not sentences:
        return {
            "ai_likelihood": 0.0,
            "avg_perplexity": 0.0,
            "document_perplexity": 0.0,
            "burstiness": 0.0,
            "confidence": 0.0,
            "sentence_scores": [],
        }

    scores = [
        sentence_perplexity(s)
        for s in sentences
    ]

    avg_perplexity = sum(scores) / len(scores)

    variance = sum(
        (s - avg_perplexity) ** 2
        for s in scores
    ) / len(scores)

    burstiness = math.sqrt(variance)

    doc_perplexity = document_perplexity(text)

    lex_div = lexical_diversity(text)
    repetition = repetition_score(text)
    length_burst = sentence_length_burstiness(sentences)

    perplexity_score = max(
        0,
        min(100, (60 - doc_perplexity) / 60 * 100)
    )

    burstiness_score = max(
        0,
        min(100, (20 - burstiness) / 20 * 100)
    )

    length_burstiness_score = max(
        0,
        min(100, (15 - length_burst) / 15 * 100)
    )

    repetition_metric = min(
        100,
        repetition * 100
    )

    diversity_metric = max(
        0,
        min(100, (1 - lex_div) * 100)
    )

    ai_likelihood = (
        0.35 * perplexity_score +
        0.20 * burstiness_score +
        0.15 * length_burstiness_score +
        0.15 * repetition_metric +
        0.15 * diversity_metric
    )

    ai_likelihood = round(
        max(0, min(100, ai_likelihood)),
        1
    )

    confidence = round(
        min(100, word_count / 5),
        1
    )

    return {
        "ai_likelihood": ai_likelihood,
        "confidence": confidence,
        "word_count": word_count,
        "avg_perplexity": round(avg_perplexity, 2),
        "document_perplexity": round(doc_perplexity, 2),
        "burstiness": round(burstiness, 2),
        "sentence_length_burstiness": round(length_burst, 2),
        "lexical_diversity": round(lex_div, 3),
        "repetition_score": round(repetition, 3),
        "sentence_scores": [
            round(s, 2)
            for s in scores
        ],
        "warning": (
            "AI detection is probabilistic and should not "
            "be treated as proof of AI or human authorship."
        ),
    }
