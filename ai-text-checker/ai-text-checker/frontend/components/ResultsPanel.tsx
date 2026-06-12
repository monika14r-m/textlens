"use client";

import { AIDetectResponse, SimilarityResponse } from "@/lib/api";

interface ResultsPanelProps {
  aiResult?: AIDetectResponse | null;
  similarityResult?: SimilarityResponse | null;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function ResultsPanel({ aiResult, similarityResult }: ResultsPanelProps) {
  if (!aiResult && !similarityResult) {
    return (
      <div className="text-sm text-gray-400 italic">
        Results will appear here after you run a check.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {aiResult && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-gray-800">AI Detection</h3>
          <ScoreBar
            label="AI-likelihood"
            value={aiResult.ai_likelihood}
            color="bg-red-500"
          />
          <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
            <span>Avg. perplexity: {aiResult.avg_perplexity}</span>
            <span>Burstiness: {aiResult.burstiness}</span>
          </div>
          <div className="text-sm leading-relaxed">
            {aiResult.sentences.map((s, i) => {
              const score = aiResult.sentence_scores[i] ?? 0;
              // Lower perplexity -> more "AI-like" -> highlight more
              const intensity = Math.max(0, Math.min(1, (40 - score) / 40));
              return (
                <span
                  key={i}
                  style={{
                    backgroundColor: `rgba(239, 68, 68, ${intensity * 0.4})`,
                  }}
                  className="rounded px-0.5"
                >
                  {s}{" "}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {similarityResult && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-gray-800">Similarity Check</h3>
          <ScoreBar
            label="Similarity"
            value={similarityResult.similarity_score}
            color="bg-yellow-500"
          />
          {similarityResult.overlaps.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Matching phrases ({similarityResult.overlaps.length}):
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                {similarityResult.overlaps.slice(0, 10).map((o, i) => (
                  <li key={i} className="text-gray-700">
                    &quot;{o.text}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
