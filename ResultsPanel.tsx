"use client";

import { AIDetectResponse, SimilarityResponse } from "@/lib/api";

interface ResultsPanelProps { aiResult?: AIDetectResponse | null; similarityResult?: SimilarityResponse | null; }

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="flex flex-col gap-2"><div className="flex justify-between text-sm"><span className="font-semibold text-slate-700">{label}</span><span className="font-mono text-slate-600">{value.toFixed(1)}%</span></div><div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>;
}

export default function ResultsPanel({ aiResult, similarityResult }: ResultsPanelProps) {
  if (!aiResult && !similarityResult) return <p className="text-sm text-slate-400">Your report will appear here when analysis finishes.</p>;
  return <div className="flex flex-col gap-7">
    {aiResult && <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-slate-800">AI-writing signals</h3><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">A heuristic estimate from language-pattern features — not a probability of misconduct or proof of authorship.</p></div><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{aiResult.ai_likelihood.toFixed(1)} / 100</span></div>
      <ScoreBar label="Estimated AI-likelihood signal" value={aiResult.ai_likelihood} color="bg-emerald-700" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Words", aiResult.word_count?.toLocaleString() ?? "—"],["Mean perplexity", String(aiResult.avg_perplexity)],["Burstiness", String(aiResult.burstiness)],["Model confidence", aiResult.confidence != null ? `${aiResult.confidence.toFixed(0)}% (heuristic)` : "Not calibrated"]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 font-mono text-sm font-semibold text-slate-700">{value}</div></div>)}</div>
      {aiResult.warning && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{aiResult.warning}</div>}
      {aiResult.sentences?.length > 0 && <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Inspect sentence-level signals</summary><div className="mt-4 flex flex-col gap-3">{aiResult.sentences.map((s,i)=>{const score=aiResult.sentence_scores?.[i];return <div key={i} className="border-l-2 border-emerald-200 pl-3"><p className="text-sm leading-6 text-slate-700">{s}</p><span className="mt-1 inline-block text-xs text-slate-400">Perplexity signal: {score == null ? "Not scored" : score}</span></div>;})}</div></details>}
    </div>}
    {similarityResult && <div className="flex flex-col gap-4">
      <div><h3 className="text-lg font-bold text-slate-800">Text overlap</h3><p className="mt-1 text-sm leading-6 text-slate-500">Similarity between the two texts you provided. This is not a web-wide plagiarism search.</p></div>
      <ScoreBar label="Pairwise text similarity" value={similarityResult.similarity_score} color="bg-amber-500" />
      {similarityResult.overlaps?.length ? <div><h4 className="mb-2 text-sm font-semibold text-slate-700">Exact phrase matches ({similarityResult.overlaps.length})</h4><ul className="flex flex-col gap-2">{similarityResult.overlaps.slice(0,20).map((o,i)=><li key={`${o.start_a}-${o.start_b}-${i}`} className="rounded-lg border border-amber-100 bg-amber-50/60 p-3"><p className="text-sm leading-6 text-slate-700">“{o.text}”</p><p className="mt-1 text-xs text-slate-400">Word position in text A: {o.start_a} · text B: {o.start_b}</p></li>)}</ul></div>:<p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No exact phrase matches were found by this check. This does not rule out paraphrased similarity or unattributed ideas.</p>}
    </div>}
  </div>;
}
