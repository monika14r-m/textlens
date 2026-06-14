"use client";

import { useState } from "react";
import TextInput from "@/components/TextInput";
import ResultsPanel from "@/components/ResultsPanel";
import {
  checkAIText,
  checkSimilarity,
  AIDetectResponse,
  SimilarityResponse,
} from "@/lib/api";

type Mode = "ai" | "similarity";

export default function Home() {
  const [mode, setMode] = useState<Mode>("ai");
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAIResult] = useState<AIDetectResponse | null>(null);
  const [similarityResult, setSimilarityResult] =
    useState<SimilarityResponse | null>(null);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    try {
      if (mode === "ai") {
        const result = await checkAIText(textA);
        setAIResult(result);
        setSimilarityResult(null);
      } else {
        const result = await checkSimilarity(textA, textB);
        setSimilarityResult(result);
        setAIResult(null);
      }
    } catch (e) {
      setError("Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">TextLens</h1>
        <p className="text-gray-500 text-sm">
          Free, open AI-content & plagiarism checker.
        </p>
      </header>

      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === "ai"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300"
          }`}
          onClick={() => setMode("ai")}
        >
          AI Detection
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === "similarity"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300"
          }`}
          onClick={() => setMode("similarity")}
        >
          Similarity Check
        </button>
      </div>

      <TextInput
        label={mode === "ai" ? "Text to analyze" : "Text A"}
        value={textA}
        onChange={setTextA}
        placeholder="Paste your text here..."
      />

      {mode === "similarity" && (
        <TextInput
          label="Text B"
          value={textB}
          onChange={setTextB}
          placeholder="Paste the second text to compare..."
        />
      )}

      <button
        onClick={handleCheck}
        disabled={loading || !textA.trim()}
        className="self-start px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Run Check"}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="border-t pt-6">
        <ResultsPanel aiResult={aiResult} similarityResult={similarityResult} />
      </div>
    </main>
  );
}
