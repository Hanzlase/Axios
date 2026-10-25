"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  HelpCircle,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCw,
  ArrowRight,
  Database,
  Bookmark,
} from "lucide-react";

type DocKey = "transformer" | "raft" | "crispr";
type ModeKey = "explain" | "quiz" | "flashcard" | "plan";
type DepthKey = "simple" | "intermediate" | "rigorous";

interface DocData {
  id: DocKey;
  filename: string;
  filesize: string;
  category: string;
  chunks: number;
  explain: Record<
    DepthKey,
    {
      summary: string;
      body: string;
      keyInsight: string;
      citation: { tag: string; excerpt: string; page: string };
    }
  >;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    citation: string;
  };
  flashcard: {
    question: string;
    answer: string[];
    concept: string;
    citation: string;
  };
  plan: {
    title: string;
    modules: { name: string; duration: string; focus: string; pages: string }[];
  };
}

const SAMPLE_DOCS: Record<DocKey, DocData> = {
  transformer: {
    id: "transformer",
    filename: "vaswani-attention-2017.pdf",
    filesize: "1.4 MB",
    category: "Neural Architectures",
    chunks: 42,
    explain: {
      simple: {
        summary: "Attention lets models look at all words at once and weigh their relationships directly.",
        body: "Instead of reading text word-by-word like a conveyor belt (RNNs), the Transformer inspects the entire sentence simultaneously. Every word calculates an 'attention score' with every other word to immediately identify what pronouns refer to and which verbs govern which nouns.",
        keyInsight: "Eliminates sequential processing bottlenecks; enables massive parallelization on GPUs.",
        citation: {
          tag: "Vaswani et al. §1",
          excerpt: "Recurrent models generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1}. This sequentially precludes parallelization within training examples.",
          page: "Page 2, Paragraph 3",
        },
      },
      intermediate: {
        summary: "Scaled Dot-Product Attention transforms Query and Key matrices into a softmax distribution over Values.",
        body: "The core mechanism maps a query and a set of key-value pairs to an output: Attention(Q, K, V) = softmax(QK^T / √d_k)V. The scaling factor 1/√d_k counteracts large dot products in high dimensions that would otherwise push the softmax function into regions with vanishingly small gradients.",
        keyInsight: "Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions.",
        citation: {
          tag: "Vaswani et al. §3.2.1",
          excerpt: "We compute the dot products of the query with all keys, divide each by √d_k, and apply a softmax function to obtain the weights on the values.",
          page: "Page 4, Equation 1",
        },
      },
      rigorous: {
        summary: "Positional encodings inject non-recurrent permutation awareness using harmonic sinusoidal frequencies.",
        body: "Because self-attention contains no recurrence and no convolution, it is strictly permutation-invariant. To preserve sequential token order, fixed sinusoidal vectors PE_{(pos, 2i)} = sin(pos/10000^{2i/d_model}) and PE_{(pos, 2i+1)} = cos(pos/10000^{2i/d_model}) are added directly to the input embeddings prior to the initial encoder layer.",
        keyInsight: "Enables the model to learn relative positions because for any fixed offset k, PE_{pos+k} can be represented as a linear function of PE_{pos}.",
        citation: {
          tag: "Vaswani et al. §3.5",
          excerpt: "The wavelengths form a geometric progression from 2π to 10000·2π. We chose this function because we hypothesized it would allow the model to easily learn to attend by relative positions.",
          page: "Page 6, Section 3.5",
        },
      },
    },
    quiz: {
      question: "Why does Scaled Dot-Product Attention divide the dot products of Q and K by √d_k before applying softmax?",
      options: [
        "To normalize the total sequence length to unit variance",
        "To prevent large dot products from pushing softmax into vanishing gradient saturation",
        "To enforce orthogonality between Query and Key projection weights",
        "To reduce computational time complexity from O(n²) to O(n log n)",
      ],
      correctIndex: 1,
      explanation: "Vaswani et al. note that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. Dividing by √d_k counters this scaling effect.",
      citation: "Vaswani et al. (2017), Page 4, Section 3.2.1",
    },
    flashcard: {
      question: "What is Multi-Head Attention and what operational advantage does it provide over single attention?",
      concept: "Multi-Head Mechanism",
      answer: [
        "Projects queries, keys, and values h times with learned linear projections to dimensions d_k, d_k, and d_v.",
        "Executes attention in parallel across each projected subspace.",
        "Concatenates outputs and projects again to produce final representation.",
        "Advantage: Prevents averaging out distinct syntactic and semantic relationships into a single attention head.",
      ],
      citation: "Vaswani et al. §3.2.2 (p. 5)",
    },
    plan: {
      title: "Mastering Transformer Architectures (5-Stage Path)",
      modules: [
        { name: "Phase 1: Attention Primitives", duration: "2 days", focus: "Self-attention matrix math, QKV projections, and scaling factor rationale", pages: "pp. 1-5" },
        { name: "Phase 2: Architectural Stack", duration: "3 days", focus: "Encoder-decoder residual blocks, LayerNorm positioning, and FFN sub-layers", pages: "pp. 5-7" },
        { name: "Phase 3: Positional Geometry", duration: "2 days", focus: "Sinusoidal frequency functions vs. learned positional embeddings", pages: "pp. 6-8" },
        { name: "Phase 4: Training & Regularization", duration: "2 days", focus: "Warmup learning rate schedules, label smoothing, and dropout", pages: "pp. 7-10" },
        { name: "Phase 5: Implementation Benchmark", duration: "3 days", focus: "PyTorch tensor implementation from scratch and attention heatmaps", pages: "pp. 10-15" },
      ],
    },
  },
  raft: {
    id: "raft",
    filename: "ongaro-raft-consensus-2014.pdf",
    filesize: "1.8 MB",
    category: "Distributed Systems",
    chunks: 56,
    explain: {
      simple: {
        summary: "Raft is an understandable consensus algorithm that keeps replicated server logs identical.",
        body: "Instead of complex Paxos symmetric agreements, Raft elects one single leader. The leader accepts all client writes, replicates them across follower servers, and only tells the client 'done' once a majority of nodes have written the log entry to disk.",
        keyInsight: "Decomposes consensus into leader election, log replication, and safety.",
        citation: {
          tag: "Ongaro & Ousterhout §1",
          excerpt: "Our primary goal was understandability: could we define a consensus algorithm that can be understood easily, and that would provide a better foundation for system building?",
          page: "Page 1, Column 2",
        },
      },
      intermediate: {
        summary: "Term numbers act as a logical clock to detect obsolete leaders and stale candidates.",
        body: "Time in Raft is divided into numbered terms. Each term begins with an election where candidates request votes. If a split vote occurs, randomized election timers prevent split-vote deadlocks by ensuring one candidate times out and starts a new election term first.",
        keyInsight: "Randomized election timeouts (typically 150-300ms) guarantee high liveness with minimal overhead.",
        citation: {
          tag: "Ongaro & Ousterhout §5.2",
          excerpt: "Raft uses randomized election timeouts to ensure that split votes are rare and that they are resolved quickly.",
          page: "Page 6, Section 5.2",
        },
      },
      rigorous: {
        summary: "The Log Matching Property and Election Restriction guarantee total state machine safety.",
        body: "If two logs contain an entry with the same index and term, they are guaranteed to be identical in all entries through the given index. A leader never overwrites or truncates its own log; it only appends. Followers reject VoteRequests if the candidate's log is less up-to-date than the voter's own log.",
        keyInsight: "State Machine Safety: If a server has applied an entry at a given index, no other server will ever apply a different entry for that index.",
        citation: {
          tag: "Ongaro & Ousterhout §5.4.1",
          excerpt: "Raft uses the voting process to prevent a candidate from winning an election unless its log contains all committed entries.",
          page: "Page 8, Section 5.4.1",
        },
      },
    },
    quiz: {
      question: "How does a Raft node determine whether a candidate requesting its vote has a log that is 'more up-to-date'?",
      options: [
        "By comparing the candidate's node IP address and uptime duration",
        "By comparing the terms and lengths of the candidates' last log entries",
        "By verifying cryptographic signatures on the previous five commit blocks",
        "By querying a centralized consensus coordinator for term confirmation",
      ],
      correctIndex: 1,
      explanation: "Section 5.4.1 states: If the logs have last entries with different terms, then the log with the later term is more up-to-date. If the logs end with the same term, then whichever log is longer is more up-to-date.",
      citation: "Ongaro & Ousterhout (2014), Page 8, Section 5.4.1",
    },
    flashcard: {
      question: "What are the three states a Raft server node can be in, and what causes state transitions?",
      concept: "Server State Lifecycle",
      answer: [
        "Follower: Passive state; responds to incoming RPCs from leaders and candidates.",
        "Candidate: Transitioned to when election timeout elapses without heartbeats; increments term and requests votes.",
        "Leader: Transitioned to when receiving votes from a majority of servers; dispatches periodic AppendEntries heartbeats.",
        "Demotion: If any node discovers an RPC with term T > currentTerm, it immediately reverts to Follower.",
      ],
      citation: "Ongaro & Ousterhout §5.1, Figure 4",
    },
    plan: {
      title: "Raft Consensus Engine Roadmap (4-Stage Path)",
      modules: [
        { name: "Phase 1: Node State & Heartbeat Loop", duration: "3 days", focus: "Ticker timers, AppendEntries RPC handlers, and term updates", pages: "pp. 1-6" },
        { name: "Phase 2: Leader Election & Quorum", duration: "4 days", focus: "VoteRequest RPCs, randomized timeouts, and split-vote handling", pages: "pp. 6-8" },
        { name: "Phase 3: Log Replication & Commit Index", duration: "4 days", focus: "MatchIndex/NextIndex tracking, majority commit confirmation, and rollback", pages: "pp. 8-11" },
        { name: "Phase 4: Persistence & Compaction", duration: "3 days", focus: "Write-ahead log fsync, snapshot creation, and InstallSnapshot RPC", pages: "pp. 11-16" },
      ],
    },
  },
  crispr: {
    id: "crispr",
    filename: "doudna-charpentier-cas9-2012.pdf",
    filesize: "2.1 MB",
    category: "Molecular Biology",
    chunks: 68,
    explain: {
      simple: {
        summary: "CRISPR-Cas9 acts as a programmable pair of molecular scissors for DNA sequences.",
        body: "Bacteria use CRISPR as an immune system to remember and slice invading virus genomes. Scientists engineered this by attaching a customized 20-nucleotide RNA guide to the Cas9 protein, enabling precise cutting at targeted genomic locations.",
        keyInsight: "Customized target specificity requires only synthesizing a complementary RNA guide.",
        citation: {
          tag: "Jinek, Chylinski, Doudna, Charpentier §1",
          excerpt: "We show that the Cas9 endonuclease can be programmed with single guide RNAs (sgRNAs) to target and cleave specific double-stranded DNA sequences.",
          page: "Science Vol 337, p. 816",
        },
      },
      intermediate: {
        summary: "Cas9 requires both a 20-nt target match and an adjacent Protospacer Adjacent Motif (PAM).",
        body: "The Cas9-RNA complex scans along DNA until it encounters a short PAM sequence (typically 5'-NGG-3' for S. pyogenes). Once PAM is engaged, Cas9 unwinds the adjacent double helix and pairs the RNA guide with the complementary DNA strand. If base pairing succeeds, both DNA strands are cleaved.",
        keyInsight: "PAM recognition provides self vs. non-self discrimination and prevents bacteria from destroying their own CRISPR loci.",
        citation: {
          tag: "Jinek et al. §2",
          excerpt: "Cas9 cleavage of DNA requires both base pairing to the guide RNA and the presence of a PAM sequence adjacent to the target site.",
          page: "Science Vol 337, p. 818",
        },
      },
      rigorous: {
        summary: "Dual catalytic domains (HNH and RuvC) execute precise double-stranded blunt cuts.",
        body: "Cas9 possesses two distinct nuclease lobes: the HNH domain cuts the complementary DNA strand (hybridized with crRNA), while the RuvC-like domain cleaves the non-complementary strand. Both cuts occur precisely 3 base pairs upstream of the PAM sequence, creating a blunt-ended double-strand break (DSB) that triggers cellular repair via NHEJ or HDR.",
        keyInsight: "Mutating either catalytic residue (D10A in RuvC or H840A in HNH) yields a single-strand 'nickase', drastically reducing off-target indels.",
        citation: {
          tag: "Jinek et al. §3",
          excerpt: "Inactivation of the RuvC domain converts Cas9 into a DNA nicking enzyme that cleaves only the strand complementary to the crRNA.",
          page: "Science Vol 337, p. 819",
        },
      },
    },
    quiz: {
      question: "What sequence motif must immediately flank the DNA target site for Streptococcus pyogenes Cas9 to initiate binding and cleavage?",
      options: [
        "A 5'-TATAAA-3' TATA box promoter",
        "A 5'-NGG-3' Protospacer Adjacent Motif (PAM)",
        "A 3'-poly(A) tail sequence of at least 15 nucleotides",
        "A palindromic EcoRI restriction recognition site",
      ],
      correctIndex: 1,
      explanation: "S. pyogenes Cas9 specifically interrogates the genome for the 5'-NGG-3' PAM sequence. Target unwinding and guide RNA annealing cannot proceed without PAM recognition.",
      citation: "Jinek, Doudna et al. (2012), Science 337:816-821",
    },
    flashcard: {
      question: "What two natural bacterial RNAs were fused by Doudna and Charpentier to engineer the single-guide RNA (sgRNA)?",
      concept: "sgRNA Engineering",
      answer: [
        "crRNA (CRISPR RNA): Contains the 20-nucleotide variable sequence complementary to the target DNA.",
        "tracrRNA (trans-activating crRNA): Structural RNA forming a scaffold duplex required to bind Cas9.",
        "Innovation: A synthetic tetraloop linker connected the 3' end of crRNA to the 5' end of tracrRNA into a single functional chimeric transcript.",
      ],
      citation: "Jinek et al. Figure 5 (Science 2012)",
    },
    plan: {
      title: "Targeted Genome Editing Study Syllabus (4-Stage Path)",
      modules: [
        { name: "Phase 1: Type II Bacterial Immunity", duration: "2 days", focus: "Adaptation, crRNA biogenesis, and interference kinetics", pages: "pp. 816-817" },
        { name: "Phase 2: Cas9 Structural Mechanics", duration: "3 days", focus: "HNH and RuvC domain active sites, PAM recognition, and conformational changes", pages: "pp. 817-819" },
        { name: "Phase 3: Guide RNA Optimization", duration: "3 days", focus: "sgRNA design rules, GC content balance, and off-target prediction algorithms", pages: "pp. 819-821" },
        { name: "Phase 4: DSB Cellular Repair Pathways", duration: "3 days", focus: "Non-homologous end joining (NHEJ) vs. homology-directed repair (HDR) templates", pages: "pp. 820-822" },
      ],
    },
  },
};

export function DocumentStudioDemo() {
  const [selectedDoc, setSelectedDoc] = useState<DocKey>("transformer");
  const [selectedMode, setSelectedMode] = useState<ModeKey>("explain");
  const [selectedDepth, setSelectedDepth] = useState<DepthKey>("intermediate");
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const doc = SAMPLE_DOCS[selectedDoc];

  const handleDocChange = (key: DocKey) => {
    setSelectedDoc(key);
    setQuizSelection(null);
    setIsFlipped(false);
  };

  const handleModeChange = (mode: ModeKey) => {
    setSelectedMode(mode);
    setQuizSelection(null);
    setIsFlipped(false);
  };

  return (
    <div className="w-full rounded-xl border border-[var(--ax-border-strong)] bg-[var(--ax-surface)] shadow-lg overflow-hidden">
      {/* Top Console Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-[var(--ax-text)]">
            Axios Document Intelligence Engine
          </span>
          <span className="hidden text-[var(--ax-text-tertiary)] sm:inline">/</span>
          <span className="hidden font-mono text-[var(--ax-text-secondary)] sm:inline">
            Hybrid Dense + BM25 Retrievable
          </span>
        </div>

        {/* Document Selector Pills */}
        <div className="mt-1.5 flex items-center gap-1 sm:mt-0">
          <span className="mr-1 hidden font-mono text-[11px] text-[var(--ax-text-tertiary)] md:inline">
            Source:
          </span>
          {(
            [
              { key: "transformer", label: "Attention (NLP)" },
              { key: "raft", label: "Raft (Systems)" },
              { key: "crispr", label: "Cas9 (Biology)" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => handleDocChange(item.key)}
              className={`rounded px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                selectedDoc === item.key
                  ? "bg-[var(--ax-text)] text-[var(--ax-accent-fg)]"
                  : "text-[var(--ax-text-secondary)] hover:bg-[var(--ax-border)] hover:text-[var(--ax-text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--ax-border)] bg-[var(--ax-surface)] px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[var(--ax-text-secondary)]" />
          <span className="font-mono font-semibold text-[var(--ax-text)]">
            {doc.filename}
          </span>
          <span className="rounded bg-[var(--ax-surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ax-text-secondary)] border border-[var(--ax-border)]">
            {doc.filesize}
          </span>
          <span className="hidden rounded bg-[var(--ax-surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ax-text-secondary)] border border-[var(--ax-border)] md:inline">
            {doc.chunks} semantic chunks
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ax-text-tertiary)]">
          <Database className="h-3 w-3" />
          <span>Local Vector Store</span>
          <span>/</span>
          <span>In-Memory</span>
        </div>
      </div>

      {/* Structured Output Mode Tabs */}
      <div className="flex items-center border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-3 overflow-x-auto">
        {(
          [
            { id: "explain", label: "Multi-Depth Explain", icon: Sparkles },
            { id: "quiz", label: "Active Recall Quiz", icon: HelpCircle },
            { id: "flashcard", label: "Spaced Flashcard", icon: Layers },
            { id: "plan", label: "Execution Roadmap", icon: Calendar },
          ] as const
        ).map((mode) => {
          const Icon = mode.icon;
          const isActive = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-[var(--ax-text)] text-[var(--ax-text)] bg-[var(--ax-surface)]"
                  : "border-transparent text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Work Area */}
      <div className="p-5 md:p-6 bg-[var(--ax-surface)] min-h-[380px]">
        {/* MODE 1: EXPLAIN */}
        {selectedMode === "explain" && (
          <div className="space-y-4">
            {/* Depth Switcher */}
            <div className="flex items-center justify-between border-b border-[var(--ax-border)] pb-3">
              <span className="font-mono text-xs text-[var(--ax-text-secondary)]">
                Explanation Depth:
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "simple", label: "1. Intuitive" },
                    { key: "intermediate", label: "2. Mechanistic" },
                    { key: "rigorous", label: "3. Mathematical" },
                  ] as const
                ).map((depth) => (
                  <button
                    key={depth.key}
                    onClick={() => setSelectedDepth(depth.key)}
                    className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                      selectedDepth === depth.key
                        ? "bg-[var(--ax-text)] text-[var(--ax-accent-fg)]"
                        : "border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)]"
                    }`}
                  >
                    {depth.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Output Card */}
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] p-3.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ax-text-tertiary)] mb-1">
                  Executive Summary
                </p>
                <p className="text-sm font-medium text-[var(--ax-text)] leading-relaxed">
                  {doc.explain[selectedDepth].summary}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-sm text-[var(--ax-text)] leading-relaxed">
                  {doc.explain[selectedDepth].body}
                </p>
              </div>

              {/* Key Insight Pill */}
              <div className="flex items-start gap-2.5 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] p-3">
                <Bookmark className="h-4 w-4 text-[var(--ax-text)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                    Core Operational Takeaway:
                  </span>
                  <p className="text-xs text-[var(--ax-text-secondary)] mt-0.5">
                    {doc.explain[selectedDepth].keyInsight}
                  </p>
                </div>
              </div>

              {/* Verified Grounded Citation */}
              <div className="mt-3 rounded-lg border border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)] p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] font-semibold text-[var(--ax-text)]">
                    Grounded Source Evidence
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ax-text-tertiary)]">
                    {doc.explain[selectedDepth].citation.page}
                  </span>
                </div>
                <blockquote className="border-l-2 border-[var(--ax-text)] pl-3 text-xs italic text-[var(--ax-text-secondary)] font-mono leading-relaxed">
                  &ldquo;{doc.explain[selectedDepth].citation.excerpt}&rdquo;
                </blockquote>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--ax-text-tertiary)] font-mono">
                  <span>Citation: {doc.explain[selectedDepth].citation.tag}</span>
                  <span className="text-[var(--ax-success)] font-medium">✓ Verified from Ingested PDF</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: QUIZ */}
        {selectedMode === "quiz" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--ax-border)] pb-3">
              <span className="font-mono text-xs font-semibold text-[var(--ax-text)]">
                Active Recall Diagnostic Question
              </span>
              <span className="font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                Target Concept Check
              </span>
            </div>

            <p className="text-sm font-medium text-[var(--ax-text)] leading-relaxed">
              {doc.quiz.question}
            </p>

            <div className="space-y-2 pt-1">
              {doc.quiz.options.map((option, idx) => {
                const isSelected = quizSelection === idx;
                const isCorrect = idx === doc.quiz.correctIndex;
                const hasAnswered = quizSelection !== null;

                let stateClasses = "border-[var(--ax-border)] bg-[var(--ax-surface)] hover:border-[var(--ax-border-strong)]";
                if (hasAnswered) {
                  if (isCorrect) {
                    stateClasses = "border-[var(--ax-success)] bg-green-50/50 dark:bg-green-950/20 text-[var(--ax-text)]";
                  } else if (isSelected) {
                    stateClasses = "border-[var(--ax-danger)] bg-red-50/50 dark:bg-red-950/20 text-[var(--ax-text)]";
                  } else {
                    stateClasses = "border-[var(--ax-border)] opacity-60";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setQuizSelection(idx)}
                    className={`w-full text-left p-3 rounded-lg border text-xs leading-relaxed transition-all flex items-start gap-3 ${stateClasses}`}
                  >
                    <span className="font-mono font-semibold shrink-0 text-[11px] mt-0.5">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span className="flex-1">{option}</span>
                    {hasAnswered && isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--ax-success)] shrink-0" />
                    )}
                    {hasAnswered && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-[var(--ax-danger)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {quizSelection !== null && (
              <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] p-3.5 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-[var(--ax-text)]">
                    {quizSelection === doc.quiz.correctIndex ? "Correct Answer" : "Detailed Explanation"}
                  </span>
                  <span className="text-[var(--ax-text-tertiary)] font-mono text-[10px]">/</span>
                  <span className="font-mono text-[10px] text-[var(--ax-text-secondary)]">
                    {doc.quiz.citation}
                  </span>
                </div>
                <p className="text-xs text-[var(--ax-text-secondary)] leading-relaxed">
                  {doc.quiz.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: FLASHCARD */}
        {selectedMode === "flashcard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--ax-border)] pb-3">
              <span className="font-mono text-xs text-[var(--ax-text-secondary)]">
                Spaced Repetition Concept Deck
              </span>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1 text-xs font-mono font-medium text-[var(--ax-text)] hover:underline"
              >
                <RotateCw className="h-3 w-3" />
                <span>{isFlipped ? "Show Prompt (Front)" : "Reveal Answer (Back)"}</span>
              </button>
            </div>

            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="group cursor-pointer relative min-h-[200px] rounded-xl border border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)] p-6 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-[var(--ax-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--ax-text-secondary)] border border-[var(--ax-border)]">
                  {doc.flashcard.concept}
                </span>
                <span className="font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                  {isFlipped ? "Answer" : "Card 1 of 12"}
                </span>
              </div>

              <div className="my-auto py-3">
                {!isFlipped ? (
                  <p className="text-sm font-medium text-[var(--ax-text)] leading-relaxed">
                    {doc.flashcard.question}
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-[var(--ax-text)]">
                    {doc.flashcard.answer.map((ans, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[var(--ax-text-tertiary)] font-mono text-[11px] font-medium">{i + 1}.</span>
                        <span>{ans}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--ax-border)] text-[11px] font-mono text-[var(--ax-text-tertiary)]">
                <span>{doc.flashcard.citation}</span>
                <span className="text-[var(--ax-text-secondary)] group-hover:text-[var(--ax-text)] transition-colors">
                  {isFlipped ? "Click to flip back" : "Click to flip card"}
                </span>
              </div>
            </div>

            {/* SM-2 grading actions */}
            <div className="flex items-center justify-between border-t border-[var(--ax-border)] pt-3 text-xs">
              <span className="font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                SM-2 Spaced Recall Rating:
              </span>
              <div className="flex items-center gap-1.5">
                {["Again (1d)", "Hard (3d)", "Good (7d)", "Easy (14d)"].map((grade, i) => (
                  <button
                    key={grade}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(false);
                    }}
                    className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium border border-[var(--ax-border)] bg-[var(--ax-surface)] transition-colors hover:bg-[var(--ax-surface-subtle)] ${
                      i === 2 ? "border-[var(--ax-text)] text-[var(--ax-text)]" : "text-[var(--ax-text-secondary)]"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE 4: PLAN */}
        {selectedMode === "plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--ax-border)] pb-3">
              <span className="font-mono text-xs font-semibold text-[var(--ax-text)]">
                {doc.plan.title}
              </span>
              <span className="font-mono text-[11px] text-[var(--ax-text-secondary)]">
                Estimated: ~2 Weeks
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {doc.plan.modules.map((mod, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] hover:border-[var(--ax-border-strong)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ax-surface-subtle)] font-mono text-[10px] font-semibold text-[var(--ax-text)] border border-[var(--ax-border)]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--ax-text)]">
                        {mod.name}
                      </p>
                      <p className="text-[11px] text-[var(--ax-text-secondary)] mt-0.5">
                        {mod.focus}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 font-mono text-[11px] text-[var(--ax-text-tertiary)]">
                    <span className="rounded bg-[var(--ax-surface-subtle)] px-2 py-0.5 text-[10px] text-[var(--ax-text-secondary)] border border-[var(--ax-border)]">
                      {mod.duration}
                    </span>
                    <span>Ref: {mod.pages}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-4 py-3 gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--ax-text-secondary)]">
          <span className="font-mono text-[11px]">Ready for your own documents:</span>
          <span className="font-mono text-[11px] text-[var(--ax-text)]">
            PDF, DOCX, TXT, CSV, Markdown
          </span>
        </div>

        <Link
          href="/workspace"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ax-text)] px-4 py-2 font-mono text-xs font-medium text-[var(--ax-accent-fg)] transition-opacity hover:opacity-90 w-full sm:w-auto justify-center"
        >
          <span>Open Full Interactive Workspace</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
