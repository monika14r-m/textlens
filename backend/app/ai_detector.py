"""AI-text detection using perplexity, burstiness, and lexical heuristics.
 
Detection is probabilistic, not definitive — results should always be
presented to end users as estimates, never as proof of authorship.
"""
 
import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
 
import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast
 
logger = logging.getLogger(__name__)
 
_MODEL_NAME = "distilgpt2"
_MAX_TOKENS = 1024
_MIN_TOKENS_FOR_PERPLEXITY = 2
 
MIN_WORDS = 100
MAX_WORDS = 20_000  # guard against pathologically large requests
 
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
 
_tokenizer: GPT2TokenizerFast | None = None
_model: GPT2LMHeadModel | None = None
 
 
@dataclass(frozen=True)
class ScoringConfig:
    """Tunable thresholds/weights for the ai_likelihood composite score.
 
    Keeping these in one place makes it possible to calibrate the detector
    against labeled data later without hunting through the scoring logic.
    """
 
    # perplexity below this value scores as "very likely AI" (100)
    perplexity_floor: float = 60.0
    # burstiness (stdev of per-sentence perplexity) below this scores high
    burstiness_floor: float = 20.0
    # stdev of sentence *lengths* below this scores high
    length_burstiness_floor: float = 15.0
 
    weight_perplexity: float = 0.35
    weight_burstiness: float = 0.20
    weight_length_burstiness: float = 0.15
    weight_repetition: float = 0.15
    weight_diversity: float = 0.15
 
    def __post_init__(self):
        total = (
            self.weight_perplexity
            + self.weight_burstiness
            + self.weight_length_burstiness
            + self.weight_repetition
            + self.weight_diversity
        )
        if not math.isclose(total, 1.0, abs_tol=1e-6):
            raise ValueError(f"Scoring weights must sum to 1.0, got {total}")
 
 
DEFAULT_CONFIG = ScoringConfig()
 
# Common abbreviations that shouldn't be treated as sentence boundaries.
_ABBREVIATIONS = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc",
    "eg", "ie", "fig", "vol", "no", "approx", "u.s", "u.k",
}
 
 
class ModelLoadError(RuntimeError):
    """Raised when the perplexity model fails to load."""
 
 
def _load_model() -> tuple[GPT2TokenizerFast, GPT2LMHeadModel]:
    global _tokenizer, _model
 
    if _model is None:
        try:
            logger.info("Loading %s on device=%s", _MODEL_NAME, _device)
            _tokenizer = GPT2TokenizerFast.from_pretrained(_MODEL_NAME)
            _model = GPT2LMHeadModel.from_pretrained(_MODEL_NAME)
            _model.to(_device)
            _model.eval()
        except Exception as exc:  # noqa: BLE001 - want to wrap any load failure
            logger.exception("Failed to load %s", _MODEL_NAME)
            raise ModelLoadError(
                f"Could not load model '{_MODEL_NAME}': {exc}"
            ) from exc
 
    return _tokenizer, _model
 
 
def split_sentences(text: str) -> list[str]:
    """Split text into sentences, tolerant of common abbreviations."""
    text = text.strip()
    if not text:
        return []
 
    # Split on sentence-ending punctuation followed by whitespace + capital/quote,
    # but not immediately after a known abbreviation.
    raw_parts = re.split(r'(?<=[.!?])\s+', text)
 
    sentences: list[str] = []
    buffer = ""
    for part in raw_parts:
        buffer = f"{buffer} {part}".strip() if buffer else part
        last_word = re.sub(r"[.!?]+$", "", buffer.split()[-1] if buffer.split() else "")
        if last_word.lower() in _ABBREVIATIONS:
            continue  # keep accumulating, this wasn't a real sentence end
        sentences.append(buffer)
        buffer = ""
 
    if buffer:
        sentences.append(buffer)
 
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
 
 
def sentence_length_burstiness(sentences: list[str]) -> float:
    lengths = [len(s.split()) for s in sentences]
    if not lengths:
        return 0.0
    mean = sum(lengths) / len(lengths)
    variance = sum((x - mean) ** 2 for x in lengths) / len(lengths)
    return math.sqrt(variance)
 
 
def batch_sentence_perplexity(sentences: list[str]) -> list[float | None]:
    """Compute perplexity for each sentence.
 
    Returns None for sentences too short to score reliably (fewer than
    _MIN_TOKENS_FOR_PERPLEXITY tokens) instead of silently returning 0.0,
    so callers can decide whether to exclude them from aggregates.
 
    Sentences are batched together with padding for one forward pass
    instead of one pass per sentence, which is significantly faster for
    longer documents.
    """
    if not sentences:
        return []
 
    tokenizer, model = _load_model()
 
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
 
    encodings = tokenizer(
        sentences,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=_MAX_TOKENS,
    ).to(_device)
 
    input_ids = encodings.input_ids
    attention_mask = encodings.attention_mask
 
    results: list[float | None] = []
 
    with torch.inference_mode():
        outputs = model(input_ids, attention_mask=attention_mask)
        logits = outputs.logits
 
        # Shift so that tokens[t] predicts tokens[t+1]
        shift_logits = logits[:, :-1, :].contiguous()
        shift_labels = input_ids[:, 1:].contiguous()
        shift_mask = attention_mask[:, 1:].contiguous()
 
        loss_fn = torch.nn.CrossEntropyLoss(reduction="none")
        per_token_loss = loss_fn(
            shift_logits.view(-1, shift_logits.size(-1)),
            shift_labels.view(-1),
        ).view(shift_labels.size())
 
        per_token_loss = per_token_loss * shift_mask
        token_counts = shift_mask.sum(dim=1)
 
        for i in range(len(sentences)):
            n_tokens = int(token_counts[i].item())
            if n_tokens < _MIN_TOKENS_FOR_PERPLEXITY:
                results.append(None)
                continue
            mean_loss = per_token_loss[i].sum().item() / n_tokens
            results.append(math.exp(mean_loss))
 
    return results
 
 
def document_perplexity(text: str) -> float:
    tokenizer, model = _load_model()
 
    encodings = tokenizer(
        text, return_tensors="pt", truncation=True, max_length=_MAX_TOKENS
    ).to(_device)
 
    with torch.inference_mode():
        outputs = model(encodings.input_ids, labels=encodings.input_ids)
 
    return math.exp(outputs.loss.item())
 
 
def _scale(value: float, floor: float, invert: bool = True) -> float:
    """Map a raw metric to a 0-100 score, clamped."""
    if invert:
        return max(0.0, min(100.0, (floor - value) / floor * 100))
    return max(0.0, min(100.0, value / floor * 100))
 
 
def analyze_text(text: str, config: ScoringConfig = DEFAULT_CONFIG) -> dict:
    word_count = len(text.split())
 
    if word_count < MIN_WORDS:
        return {
            "error": "Text too short for reliable analysis",
            "word_count": word_count,
            "minimum_required": MIN_WORDS,
        }
 
    if word_count > MAX_WORDS:
        return {
            "error": "Text too long for analysis",
            "word_count": word_count,
            "maximum_allowed": MAX_WORDS,
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
 
    try:
        raw_scores = batch_sentence_perplexity(sentences)
        doc_perplexity = document_perplexity(text)
    except ModelLoadError as exc:
        return {"error": str(exc)}
 
    # Exclude sentences too short to score reliably from aggregate stats,
    # but keep placeholders in the returned per-sentence list.
    scored = [s for s in raw_scores if s is not None]
    if not scored:
        avg_perplexity = 0.0
        burstiness = 0.0
    else:
        avg_perplexity = sum(scored) / len(scored)
        variance = sum((s - avg_perplexity) ** 2 for s in scored) / len(scored)
        burstiness = math.sqrt(variance)
 
    lex_div = lexical_diversity(text)
    repetition = repetition_score(text)
    length_burst = sentence_length_burstiness(sentences)
 
    perplexity_score = _scale(doc_perplexity, config.perplexity_floor)
    burstiness_score = _scale(burstiness, config.burstiness_floor)
    length_burstiness_score = _scale(length_burst, config.length_burstiness_floor)
    repetition_metric = min(100.0, repetition * 100)
    diversity_metric = max(0.0, min(100.0, (1 - lex_div) * 100))
 
    ai_likelihood = (
        config.weight_perplexity * perplexity_score
        + config.weight_burstiness * burstiness_score
        + config.weight_length_burstiness * length_burstiness_score
        + config.weight_repetition * repetition_metric
        + config.weight_diversity * diversity_metric
    )
    ai_likelihood = round(max(0.0, min(100.0, ai_likelihood)), 1)
 
    confidence = round(min(100.0, word_count / 5), 1)
 
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
            round(s, 2) if s is not None else None for s in raw_scores
        ],
        "sentences": sentences,
        "warning": (
            "AI detection is probabilistic and should not "
            "be treated as proof of AI or human authorship."
        ),
    }
 
