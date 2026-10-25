import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DocumentStudioDemo } from "@/components/landing/DocumentStudioDemo";
import {
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  FileCheck,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-text)] flex flex-col font-sans">
      {/* ─── Top Navigation ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[var(--ax-border)] bg-[var(--ax-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ax-text)] text-[var(--ax-accent-fg)] transition-transform group-hover:scale-105">
              <span className="font-mono text-xs font-bold tracking-tight">Ax</span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-semibold tracking-tight text-[var(--ax-text)]">
                Axios
              </span>
              <span className="hidden font-mono text-[10px] text-[var(--ax-text-tertiary)] sm:block">
                Document Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation Anchors */}
          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#interactive-demo"
              className="text-xs font-medium text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)] transition-colors"
            >
              Interactive Demo
            </a>
            <a
              href="#pipeline"
              className="text-xs font-medium text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)] transition-colors"
            >
              Retrieval Pipeline
            </a>
            <a
              href="#capabilities"
              className="text-xs font-medium text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)] transition-colors"
            >
              Core Capabilities
            </a>
            <a
              href="#comparison"
              className="text-xs font-medium text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)] transition-colors"
            >
              Architecture Matrix
            </a>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ax-text)] px-3.5 py-1.5 font-mono text-xs font-semibold text-[var(--ax-accent-fg)] shadow-sm transition-opacity hover:opacity-90"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ─── Hero Section ─────────────────────────────────────── */}
        <section className="relative border-b border-[var(--ax-border)] px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            {/* Main Headline */}
            <h1 className="max-w-3xl font-sans text-3xl font-semibold tracking-tight text-[var(--ax-text)] sm:text-5xl sm:leading-[1.12]">
              Turn complex technical documents into verified, structured intelligence.
            </h1>

            {/* Subhead */}
            <p className="mt-5 max-w-2xl text-base text-[var(--ax-text-secondary)] leading-relaxed sm:text-lg">
              Axios indexes your research papers, specifications, and reports locally. Combining dense vector embeddings with BM25 sparse keyword search and neural reranking, it synthesizes multi-depth explanations, active quizzes, spaced flashcards, and study plans, grounded in verbatim page citations.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--ax-text)] px-5 py-2.5 font-mono text-sm font-semibold text-[var(--ax-accent-fg)] shadow-sm transition-all hover:opacity-90"
              >
                <span>Open Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#interactive-demo"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-5 py-2.5 font-mono text-sm font-medium text-[var(--ax-text)] transition-colors hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)]"
              >
                <span>Try Live Demo</span>
              </a>
            </div>

            {/* Engineering Metrics Grid */}
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-t border-[var(--ax-border)] pt-8">
              <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--ax-text-secondary)]">
                  <Database className="h-3.5 w-3.5 text-[var(--ax-text)]" />
                  <span>Hybrid Retrieval</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--ax-text)]">
                  FAISS + BM25
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ax-text-tertiary)]">
                  Dense vectors plus exact keyword matching
                </p>
              </div>

              <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--ax-text-secondary)]">
                  <Cpu className="h-3.5 w-3.5 text-[var(--ax-text)]" />
                  <span>Neural Rerank</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--ax-text)]">
                  Cohere Rerank-3
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ax-text-tertiary)]">
                  Cross-encoder relevance scoring
                </p>
              </div>

              <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--ax-text-secondary)]">
                  <FileCheck className="h-3.5 w-3.5 text-[var(--ax-text)]" />
                  <span>Source Grounding</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--ax-text)]">
                  Verbatim Citations
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ax-text-tertiary)]">
                  Exact page & section proof per assertion
                </p>
              </div>

              <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--ax-text-secondary)]">
                  <Lock className="h-3.5 w-3.5 text-[var(--ax-text)]" />
                  <span>Session Isolation</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--ax-text)]">
                  Zero Data Retention
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ax-text-tertiary)]">
                  Docs stay within your active session
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Interactive Product Workbench ────────────────────── */}
        <section
          id="interactive-demo"
          className="scroll-mt-14 border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">
                Live Interactive Workbench
              </span>
              <h2 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[var(--ax-text)] sm:text-3xl">
                Inspect real document transformations in real time.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--ax-text-secondary)] leading-relaxed">
                Test the actual generation engines below. Switch between sample research papers, compare explanation depths, test your recall with real multiple-choice questions, and flip active study flashcards.
              </p>
            </div>

            {/* Document Studio Client Interactive Component */}
            <DocumentStudioDemo />
          </div>
        </section>

        {/* ─── Retrieval Pipeline Architecture ─────────────────── */}
        <section
          id="pipeline"
          className="scroll-mt-14 border-b border-[var(--ax-border)] px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-12">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">
                Technical Architecture
              </span>
              <h2 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[var(--ax-text)] sm:text-3xl">
                The hybrid retrieval and grounded generation pipeline.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--ax-text-secondary)] leading-relaxed">
                Generic chatbots hallucinate because they stuff raw text into an unstructured context window. Axios executes a multi-stage retrieval architecture designed specifically for precision knowledge extraction.
              </p>
            </div>

            {/* Pipeline Flow Diagram Grid */}
            <div className="grid gap-4 md:grid-cols-4">
              {/* Step 1 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--ax-text-tertiary)] mb-3">
                    <span className="font-semibold text-[var(--ax-text)]">01</span>
                    <FileText className="h-4 w-4 text-[var(--ax-text)]" />
                  </div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--ax-text)]">
                    Ingestion & Chunking
                  </h3>
                  <p className="mt-2 text-xs text-[var(--ax-text-secondary)] leading-relaxed">
                    Parses PDFs, DOCX, CSV, and Markdown. Splits content using structure-aware semantic chunking with overlapping contextual headers.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--ax-border)] font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                  Preserves table layouts & page coordinates
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--ax-text-tertiary)] mb-3">
                    <span className="font-semibold text-[var(--ax-text)]">02</span>
                    <Search className="h-4 w-4 text-[var(--ax-text)]" />
                  </div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--ax-text)]">
                    Dual Hybrid Indexing
                  </h3>
                  <p className="mt-2 text-xs text-[var(--ax-text-secondary)] leading-relaxed">
                    Builds dual indices: high-dimensional FAISS vectors for semantic conceptual queries, and BM25 sparse index for exact term numbers and acronyms.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--ax-border)] font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                  Zero semantic drift on technical jargon
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--ax-text-tertiary)] mb-3">
                    <span className="font-semibold text-[var(--ax-text)]">03</span>
                    <Cpu className="h-4 w-4 text-[var(--ax-text)]" />
                  </div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--ax-text)]">
                    Neural Reranking
                  </h3>
                  <p className="mt-2 text-xs text-[var(--ax-text-secondary)] leading-relaxed">
                    Top retrieved candidates are scored by a cross-encoder (Cohere Rerank-3). Re-ranks passages by query relevance, filtering out noisy distractor chunks.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--ax-border)] font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                  Top-k relevance thresholding
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--ax-text-tertiary)] mb-3">
                    <span className="font-semibold text-[var(--ax-text)]">04</span>
                    <Sparkles className="h-4 w-4 text-[var(--ax-text)]" />
                  </div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--ax-text)]">
                    Structured Synthesis
                  </h3>
                  <p className="mt-2 text-xs text-[var(--ax-text-secondary)] leading-relaxed">
                    Routes directly to requested schema (Explain, Quiz, Flashcards, Plan). Streams verified outputs via Server-Sent Events (SSE) with clickable citations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--ax-border)] font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                  Real-time token streaming with citations
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Core Capabilities Breakdown ─────────────────────── */}
        <section
          id="capabilities"
          className="scroll-mt-14 border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-12">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">
                Engine Capabilities
              </span>
              <h2 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[var(--ax-text)] sm:text-3xl">
                Four specialized output models built for deep learning.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--ax-text-secondary)] leading-relaxed">
                Rather than treating all knowledge work as a generic conversation, Axios targets the specific cognitive operations required to master complex documentation.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Capability 1 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--ax-text)] mb-3">
                  Multi-Depth Cognitive Explanation
                </h3>
                <p className="text-sm text-[var(--ax-text-secondary)] leading-relaxed mb-4">
                  Analyze technical concepts at three calibrated depths without losing prior session context or having to restate your query:
                </p>
                <div className="space-y-2 border-t border-[var(--ax-border)] pt-4 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Intuitive:</span>
                    <span className="text-[var(--ax-text-secondary)]">First-principles conceptual analogies for rapid onboarding</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Mechanistic:</span>
                    <span className="text-[var(--ax-text-secondary)]">Component interactions, architectural blocks, and state workflows</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Rigorous:</span>
                    <span className="text-[var(--ax-text-secondary)]">Formal mathematics, complexity bounds, and verbatim proof citations</span>
                  </div>
                </div>
              </div>

              {/* Capability 2 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--ax-text)] mb-3">
                  Active Recall Diagnostic Quizzing
                </h3>
                <p className="text-sm text-[var(--ax-text-secondary)] leading-relaxed mb-4">
                  Generate multiple-choice and conceptual assessment questions strictly based on the content of your uploaded materials:
                </p>
                <div className="space-y-2 border-t border-[var(--ax-border)] pt-4 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Diagnostic Options:</span>
                    <span className="text-[var(--ax-text-secondary)]">Distractors are plausible common misconceptions, not arbitrary random strings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Immediate Rationale:</span>
                    <span className="text-[var(--ax-text-secondary)]">Detailed feedback on why correct options hold and why distractors fail</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Evidence Linking:</span>
                    <span className="text-[var(--ax-text-secondary)]">Direct page references pinpointing the source of truth</span>
                  </div>
                </div>
              </div>

              {/* Capability 3 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--ax-text)] mb-3">
                  Spaced Repetition Flashcards
                </h3>
                <p className="text-sm text-[var(--ax-text-secondary)] leading-relaxed mb-4">
                  Synthesize high-yield study decks formatted for spaced retrieval practice and retention:
                </p>
                <div className="space-y-2 border-t border-[var(--ax-border)] pt-4 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">3D Interactive Practice:</span>
                    <span className="text-[var(--ax-text-secondary)]">Flip cards directly inside the browser workspace</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">SM-2 Interval Scheduling:</span>
                    <span className="text-[var(--ax-text-secondary)]">Grade recall difficulty (Again, Hard, Good, Easy)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Anki / CSV Export:</span>
                    <span className="text-[var(--ax-text-secondary)]">1-click export to standard CSV compatible with Anki decks</span>
                  </div>
                </div>
              </div>

              {/* Capability 4 */}
              <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--ax-text)] mb-3">
                  Document Execution Roadmaps
                </h3>
                <p className="text-sm text-[var(--ax-text-secondary)] leading-relaxed mb-4">
                  Convert complex multi-chapter specifications or papers into step-by-step master syllabi:
                </p>
                <div className="space-y-2 border-t border-[var(--ax-border)] pt-4 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Phase Decomposition:</span>
                    <span className="text-[var(--ax-text-secondary)]">Breaks monolithic texts into sequential modular milestones</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Time Estimates:</span>
                    <span className="text-[var(--ax-text-secondary)]">Calibrated reading and implementation effort per section</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--ax-text)] shrink-0">Markdown Export:</span>
                    <span className="text-[var(--ax-text-secondary)]">Download roadmaps as formatted Markdown or PDF checklists</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Architectural Comparison Matrix ─────────────────── */}
        <section
          id="comparison"
          className="scroll-mt-14 border-b border-[var(--ax-border)] px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-10">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">
                System Comparison
              </span>
              <h2 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[var(--ax-text)] sm:text-3xl">
                Why standard AI chat fails on real documents.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--ax-text-secondary)] leading-relaxed">
                Most web chat interfaces are generalists designed for open-ended conversation. Axios is a specialized document intelligence instrument engineered for zero-hallucination knowledge synthesis.
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] font-mono text-[11px] text-[var(--ax-text)]">
                    <th className="p-3.5 font-semibold sm:w-1/4">Architecture Dimension</th>
                    <th className="p-3.5 font-semibold text-[var(--ax-text-secondary)] sm:w-3/8">
                      Standard Cloud Chat (ChatGPT / Claude Web)
                    </th>
                    <th className="p-3.5 font-semibold text-[var(--ax-text)] sm:w-3/8 bg-[var(--ax-surface)]">
                      Axios Local-First Document RAG
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ax-border)] font-sans">
                  <tr>
                    <td className="p-3.5 font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                      Retrieval Strategy
                    </td>
                    <td className="p-3.5 text-[var(--ax-text-secondary)] leading-relaxed">
                      Single vector embedding search or brute-force context stuffing; frequently misses specific numbers, formulas, and acronyms.
                    </td>
                    <td className="p-3.5 font-medium text-[var(--ax-text)] bg-[var(--ax-surface)] leading-relaxed">
                      <span className="font-mono font-semibold text-[var(--ax-text)]">Hybrid FAISS + BM25</span> with Cohere neural reranking for exact term precision and semantic recall.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3.5 font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                      Source Grounding
                    </td>
                    <td className="p-3.5 text-[var(--ax-text-secondary)] leading-relaxed">
                      Black-box answers; quotes are synthesized post-generation and frequently hallucinated.
                    </td>
                    <td className="p-3.5 font-medium text-[var(--ax-text)] bg-[var(--ax-surface)] leading-relaxed">
                      <span className="font-mono font-semibold text-[var(--ax-text)]">Verbatim citations</span> linked to exact source document pages and paragraph boundaries.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3.5 font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                      Output Structures
                    </td>
                    <td className="p-3.5 text-[var(--ax-text-secondary)] leading-relaxed">
                      Unstructured free-form conversational text; requires custom prompting every interaction.
                    </td>
                    <td className="p-3.5 font-medium text-[var(--ax-text)] bg-[var(--ax-surface)] leading-relaxed">
                      <span className="font-mono font-semibold text-[var(--ax-text)]">4 Schema Engines</span>: 3-depth explanations, interactive quizzes, flashcards, and structured roadmaps.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3.5 font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                      Data Privacy & Storage
                    </td>
                    <td className="p-3.5 text-[var(--ax-text-secondary)] leading-relaxed">
                      Files are uploaded to remote corporate servers and retained according to vendor policies.
                    </td>
                    <td className="p-3.5 font-medium text-[var(--ax-text)] bg-[var(--ax-surface)] leading-relaxed">
                      <span className="font-mono font-semibold text-[var(--ax-text)]">Session-scoped context</span>. Documents are indexed in temporary local state; zero telemetry retention.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3.5 font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                      Artifact Export
                    </td>
                    <td className="p-3.5 text-[var(--ax-text-secondary)] leading-relaxed">
                      Manual copy-pasting required; no native Anki CSV, Markdown, or PDF packaging.
                    </td>
                    <td className="p-3.5 font-medium text-[var(--ax-text)] bg-[var(--ax-surface)] leading-relaxed">
                      <span className="font-mono font-semibold text-[var(--ax-text)]">1-Click Export</span> to formatted Markdown, Anki-ready CSV, or standalone PDF summaries.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── Ready to Launch CTA ─────────────────────────────── */}
        <section className="border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--ax-border-strong)] bg-[var(--ax-surface)] p-8 sm:p-12 shadow-sm text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">
              Immediate Access / No Account Required
            </span>

            <h2 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-[var(--ax-text)] sm:text-4xl">
              Ready to interrogate your documents?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--ax-text-secondary)] leading-relaxed sm:text-base">
              Drop your PDF, Word document, CSV, or Markdown notes into the workspace. Indexing takes seconds, and your files never leave your private session.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--ax-text)] px-6 py-3 font-mono text-sm font-semibold text-[var(--ax-accent-fg)] shadow-sm transition-opacity hover:opacity-90"
              >
                <span>Launch Axios Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#interactive-demo"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-6 py-3 font-mono text-sm font-medium text-[var(--ax-text)] transition-colors hover:border-[var(--ax-border-strong)]"
              >
                <span>Inspect Sample Papers</span>
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[var(--ax-text-tertiary)]">
              <span>Zero signups required</span>
              <span>Local in-memory session index</span>
              <span>Instant export to Markdown and CSV</span>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Modern Technical Footer ───────────────────────────── */}
      <footer className="bg-[var(--ax-surface)] border-t border-[var(--ax-border)] py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[var(--ax-text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--ax-text)] text-[var(--ax-accent-fg)] font-bold text-[10px]">
              Ax
            </div>
            <span className="font-semibold text-[var(--ax-text)]">Axios</span>
            <span className="text-[var(--ax-text-tertiary)]">/ Local-First Document RAG</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/workspace" className="hover:text-[var(--ax-text)] transition-colors">
              Workspace
            </Link>
            <a href="#pipeline" className="hover:text-[var(--ax-text)] transition-colors">
              Pipeline
            </a>
            <a href="#capabilities" className="hover:text-[var(--ax-text)] transition-colors">
              Capabilities
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[var(--ax-text)] transition-colors">
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--ax-text-tertiary)]">
            <span>Local Session Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}