const raw = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = raw && raw.trim() ? raw.trim() : "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ?? controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  }
}

export interface AIDetectResponse {
  ai_likelihood: number;
  avg_perplexity: number;
  burstiness: number;
  sentence_scores: number[];
  sentences: string[];
}

export interface OverlapSpan {
  text: string;
  start_a: number;
  start_b: number;
}

export interface SimilarityResponse {
  similarity_score: number;
  overlaps: OverlapSpan[] | null;
}

export const checkAIText = (
  text: string,
  signal?: AbortSignal,
): Promise<AIDetectResponse> =>
  apiFetch<AIDetectResponse>("/analyze/ai", { text }, signal);

export const checkSimilarity = (
  textA: string,
  textB: string,
  signal?: AbortSignal,
): Promise<SimilarityResponse> =>
  apiFetch<SimilarityResponse>(
    "/analyze/similarity",
    { text_a: textA, text_b: textB },
    signal,
  );
