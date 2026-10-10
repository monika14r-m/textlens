const raw = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = raw && raw.trim() ? raw.trim().replace(/\/$/, "") : "http://localhost:8000";

async function apiFetch<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const activeSignal = signal ?? controller.signal;
  try {
    const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: activeSignal });
    if (!res.ok) {
      let detail = `Request failed (${res.status})`;
      try { const payload = await res.json(); if (payload.detail) detail = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail); } catch { /* non-JSON error */ }
      throw new Error(detail);
    }
    return await res.json() as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("The request timed out. The analysis model may still be starting up; try again.");
    throw err;
  } finally { clearTimeout(timeout); }
}

export interface AIDetectResponse {
  ai_likelihood: number; avg_perplexity: number; burstiness: number;
  sentence_scores: Array<number | null>; sentences: string[];
  confidence?: number; word_count?: number; document_perplexity?: number;
  sentence_length_burstiness?: number; lexical_diversity?: number;
  repetition_score?: number; warning?: string;
}
export interface OverlapSpan { text: string; start_a: number; start_b: number; }
export interface SimilarityResponse { similarity_score: number; overlaps: OverlapSpan[] | null; }
export interface ExtractDocumentResponse { text: string; word_count: number; filename: string; }
export interface RevisionResponse { revised_text: string; notes: string; }

export const checkAIText = (text: string, signal?: AbortSignal) =>
  apiFetch<AIDetectResponse>("/analyze/ai", { text }, signal);
export const checkSimilarity = (textA: string, textB: string, signal?: AbortSignal) =>
  apiFetch<SimilarityResponse>("/analyze/similarity", { text_a: textA, text_b: textB }, signal);

export async function extractDocument(file: File): Promise<ExtractDocumentResponse> {
  const data = new FormData(); data.append("file", file);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${API_BASE}/documents/extract`, { method: "POST", body: data, signal: controller.signal });
    if (!res.ok) {
      let detail = `Could not read document (${res.status})`;
      try { const payload = await res.json(); if (payload.detail) detail = String(payload.detail); } catch { /* ignore */ }
      throw new Error(detail);
    }
    return await res.json() as ExtractDocumentResponse;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Document extraction timed out. Try a smaller file.");
    throw err;
  } finally { clearTimeout(timeout); }
}

export const reviseText = (text: string, goal: string, signal?: AbortSignal) =>
  apiFetch<RevisionResponse>("/writing/revise", { text, goal }, signal);
