"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import {
  AIDetectResponse,
  SimilarityResponse,
  checkAIText,
  checkSimilarity,
  extractDocument,
  reviseText,
} from "@/lib/api";
import ResultsPanel from "@/components/ResultsPanel";

type Mode = "review" | "compare";
type RevisionGoal = "clarity" | "grammar" | "concise" | "academic";

function FileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7"><path d="M6 2.75h7l5 5v13.5H6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M13 2.75v5h5M8.5 13h7M8.5 16.5h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("review");
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [reviseLoading, setReviseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiResult, setAIResult] = useState<AIDetectResponse | null>(null);
  const [similarityResult, setSimilarityResult] = useState<SimilarityResponse | null>(null);
  const [editedText, setEditedText] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionGoal, setRevisionGoal] = useState<RevisionGoal>("clarity");

  const wordCount = useMemo(() => textA.trim() ? textA.trim().split(/\s+/).length : 0, [textA]);

  async function readFile(file?: File) {
    if (!file) return;
    setError(null);
    setNotice(null);
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx", "txt", "md"].includes(ext || "")) {
      setError("Upload a PDF, DOCX, TXT, or Markdown file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("This file is over 15 MB. Please upload a smaller document.");
      return;
    }
    setExtracting(true);
    try {
      const extracted = await extractDocument(file);
      if (!extracted.text.trim()) throw new Error("No selectable text was found. Scanned PDFs need OCR, which is not enabled yet.");
      setTextA(extracted.text);
      setFileName(file.name);
      setAIResult(null);
      setSimilarityResult(null);
      setEditedText("");
      setRevisionNotes("");
      setNotice(`Imported ${file.name} · ${extracted.word_count.toLocaleString()} words`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file. Check that the API is running.");
    } finally {
      setExtracting(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    void readFile(e.dataTransfer.files?.[0]);
  }

  async function handleCheck() {
    if (mode === "review" && wordCount < 100) {
      setError("Add at least 100 words for the current AI-likelihood analysis. You can still compare shorter text in Compare.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "review") {
        const result = await checkAIText(textA);
        setAIResult(result);
        setSimilarityResult(null);
      } else {
        if (!textB.trim()) throw new Error("Paste a second text or upload a comparison document.");
        const result = await checkSimilarity(textA, textB);
        setSimilarityResult(result);
        setAIResult(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Check the backend connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevise() {
    if (!textA.trim()) return;
    setRevisionError(null);
    setNotice(null);
    setReviseLoading(true);
    try {
      const result = await reviseText(textA, revisionGoal);
      setEditedText(result.revised_text);
      setRevisionNotes(result.notes || "Review the revised draft carefully and verify every factual statement and citation.");
    } catch (e) {
      setRevisionError(e instanceof Error ? e.message : "Could not revise the draft. Check the AI provider configuration.");
    } finally {
      setReviseLoading(false);
    }
  }

  function downloadEditedText() {
    const blob = new Blob([editedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "textlens-revised-draft.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <nav className="topbar">
        <a className="brand" href="/" aria-label="TextLens home"><span className="brand-mark">T</span><span>textlens<span className="brand-dot">.</span></span></a>
        <div className="nav-links"><a href="#workspace">Workspace</a><a href="#how-it-works">How it works</a><a href="https://github.com/monika14r-m/textlens" target="_blank" rel="noreferrer">Open source ↗</a></div>
        <span className="privacy-pill"><span className="privacy-dot" /> No account needed</span>
      </nav>

      <section className="hero">
        <div className="hero-eyebrow"><span className="eyebrow-line" /> DOCUMENT INTELLIGENCE, SIMPLIFIED</div>
        <h1>Your work.<br /><span>Understood.</span></h1>
        <p className="hero-copy">Review writing signals, spot text overlap, and strengthen your draft — all in one calm, focused workspace.</p>
        <div className="hero-points"><span><i>✓</i> PDF & DOCX ready</span><span><i>✓</i> Transparent analysis</span><span><i>✓</i> No account required</span></div>
      </section>

      <section id="workspace" className="workspace-wrap">
        <div className="workspace-heading">
          <div><div className="section-kicker">YOUR WORKSPACE</div><h2>Start with a document</h2><p>Upload a project or paste your text to get started.</p></div>
          <span className="free-pill">NO ACCOUNT</span>
        </div>

        <div className="workspace-card">
          <div className="mode-tabs" role="tablist" aria-label="Analysis mode">
            <button role="tab" aria-selected={mode === "review"} className={mode === "review" ? "mode-tab active" : "mode-tab"} onClick={() => { setMode("review"); setError(null); }}><span className="tab-icon">◉</span> Writing review</button>
            <button role="tab" aria-selected={mode === "compare"} className={mode === "compare" ? "mode-tab active" : "mode-tab"} onClick={() => { setMode("compare"); setError(null); }}><span className="tab-icon">≋</span> Compare texts</button>
          </div>

          <div className="upload-grid">
            <div className="upload-column">
              <div className="field-heading"><label htmlFor="main-text">{mode === "review" ? "Document to review" : "Original text"}</label><span>{wordCount.toLocaleString()} words</span></div>
              <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
                <input id="main-file" className="sr-only" type="file" accept=".pdf,.docx,.txt,.md" onChange={(e: ChangeEvent<HTMLInputElement>) => void readFile(e.target.files?.[0])} />
                <label htmlFor="main-file" className="upload-prompt"><span className="upload-icon"><FileIcon /></span><span className="upload-title">{extracting ? "Reading document…" : "Drop your file here"}</span><span className="upload-subtitle">or <u>browse files</u></span><span className="file-types">PDF · DOCX · TXT · MD <b>·</b> Up to 15 MB</span></label>
              </div>
              {fileName && <div className="file-chip"><span className="file-chip-icon">↳</span><span className="file-chip-name">{fileName}</span><button aria-label="Remove uploaded file" onClick={() => { setFileName(""); setTextA(""); setAIResult(null); setSimilarityResult(null); setEditedText(""); }}>×</button></div>}
              <textarea id="main-text" className="document-textarea" value={textA} onChange={(e) => { setTextA(e.target.value); setFileName(""); }} placeholder="Or paste your project text here…" spellCheck />
              <div className="editor-footer"><span>Text is sent to the configured server when you run a check.</span><button className="text-button" onClick={() => { setTextA(""); setFileName(""); setAIResult(null); setSimilarityResult(null); setEditedText(""); setRevisionNotes(""); setError(null); }}>Clear text</button></div>
            </div>

            {mode === "compare" ? (
              <div className="compare-column">
                <div className="field-heading"><label htmlFor="compare-text">Text to compare against</label><span>{textB.trim() ? textB.trim().split(/\s+/).length.toLocaleString() : 0} words</span></div>
                <textarea id="compare-text" className="compare-textarea" value={textB} onChange={(e) => setTextB(e.target.value)} placeholder="Paste the second version or document text here…" spellCheck />
                <input className="sr-only" type="file" id="second-file" accept=".pdf,.docx,.txt,.md" onChange={(e) => { const f=e.target.files?.[0]; if(f) { void (async()=>{setExtracting(true);try{const x=await extractDocument(f);setTextB(x.text);setNotice(`Imported comparison: ${f.name}`);}catch(err){setError(err instanceof Error?err.message:"Could not read file.");}finally{setExtracting(false);}})(); } }} />
                <label htmlFor="second-file" className="secondary-upload">＋ Upload comparison document</label>
                <p className="compare-note">This compares the two texts you provide. It does not scan the entire internet or private academic databases.</p>
              </div>
            ) : (
              <aside className="side-info">
                <div className="side-info-top"><span className="sparkle">✳</span><span>WHAT YOU’LL GET</span></div>
                <div className="feature-row"><span className="feature-number">01</span><div><strong>Writing signals</strong><p>A probabilistic AI-likelihood estimate, with sentence-level signals.</p></div></div>
                <div className="feature-row"><span className="feature-number">02</span><div><strong>Text overlap</strong><p>Compare against a source you provide to find exact phrase matches.</p></div></div>
                <div className="feature-row"><span className="feature-number">03</span><div><strong>AI revision</strong><p>Improve clarity, grammar, structure, or concision while keeping your meaning.</p></div></div>
                <div className="side-note"><span>ⓘ</span><p>AI detection is not proof of authorship. Scores can be wrong, including for human-written work.</p></div>
              </aside>
            )}
          </div>

          {error && <div className="notice error-notice" role="alert"><span>!</span>{error}</div>}
          {notice && <div className="notice success-notice" role="status"><span>✓</span>{notice}</div>}
          <div className="run-row"><div className="secure-caption"><span>⌑</span> No account required <b>·</b> No saved history</div><button className="primary-button" disabled={loading || extracting || !textA.trim() || (mode === "compare" && !textB.trim())} onClick={() => void handleCheck()}>{loading ? <><span className="spinner" /> Analyzing…</> : mode === "review" ? <>Analyze document <span>→</span></> : <>Compare texts <span>→</span></>}</button></div>
        </div>

        {(aiResult || similarityResult) && <section className="results-card"><div className="results-title"><div><div className="section-kicker">ANALYSIS REPORT</div><h2>Your results</h2></div><span className="report-status">Analysis complete</span></div><ResultsPanel aiResult={aiResult} similarityResult={similarityResult} /></section>}

        {textA.trim().length > 0 && <section className="revision-card"><div className="revision-header"><div><div className="section-kicker">REVISION WORKSPACE</div><h2>Improve your draft with AI</h2><p>Make the writing clearer and more precise without inventing claims or references. This tool does not promise to bypass AI detectors.</p></div></div><div className="revision-controls"><label htmlFor="revision-goal">Revision focus</label><select id="revision-goal" value={revisionGoal} onChange={(e) => setRevisionGoal(e.target.value as RevisionGoal)}><option value="clarity">Clarity & flow</option><option value="grammar">Grammar & spelling</option><option value="concise">Make it more concise</option><option value="academic">Academic tone</option></select><button className="revise-button" disabled={reviseLoading || !textA.trim()} onClick={() => void handleRevise()}>{reviseLoading ? <><span className="spinner" /> Revising…</> : <>Revise with AI <span>✳</span></>}</button></div><p className="provider-note">AI revision sends your text to the model provider configured on the backend. Review the output and verify facts and citations before using it.</p>{revisionError && <div className="notice error-notice inline-notice" role="alert"><span>!</span>{revisionError}</div>}{editedText && <div className="revision-output"><div className="revision-output-heading"><strong>Revised draft</strong><button className="text-button" onClick={downloadEditedText}>Download .txt ↓</button></div>{revisionNotes && <p className="revision-notes">{revisionNotes}</p>}<textarea className="revision-textarea" value={editedText} onChange={(e) => setEditedText(e.target.value)} aria-label="Revised draft" /><div className="revision-output-footer"><button className="text-button" onClick={() => {setTextA(editedText);setFileName("");setAIResult(null);setSimilarityResult(null);setNotice("Revised draft moved into the main editor. Run analysis again to review it.");}}>Use as working draft ↑</button></div></div>}</section>}
      </section>

      <section id="how-it-works" className="how-section"><div className="section-kicker">BUILT FOR RESPONSIBLE REVIEW</div><h2>Clarity over black boxes.</h2><div className="how-grid"><article><span>01</span><h3>Upload or paste</h3><p>Bring a selectable-text PDF, Word document, or plain text draft into your workspace.</p></article><article><span>02</span><h3>Read the signals</h3><p>Review writing-pattern estimates and compare text you have permission to use.</p></article><article><span>03</span><h3>Improve with intent</h3><p>Fix unclear passages, add attribution, and keep a record of your own reasoning.</p></article></div></section>
      <footer className="site-footer"><a className="brand" href="/"><span className="brand-mark">T</span><span>textlens<span className="brand-dot">.</span></span></a><span>Open source. Built for better writing.</span><a href="https://github.com/monika14r-m/textlens" target="_blank" rel="noreferrer">View source ↗</a></footer>
    </main>
  );
}
