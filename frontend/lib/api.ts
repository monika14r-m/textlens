const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  overlaps: OverlapSpan[];
}

export async function checkAIText(text: string): Promise<AIDetectResponse> {
  const res = await fetch(`${API_BASE}/analyze/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("AI detection request failed");
  return res.json();
}

export async function checkSimilarity(
  textA: string,
  textB: string
): Promise<SimilarityResponse> {
  const res = await fetch(`${API_BASE}/analyze/similarity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text_a: textA, text_b: textB }),
  });
  if (!res.ok) throw new Error("Similarity request failed");
  return res.json();
}
