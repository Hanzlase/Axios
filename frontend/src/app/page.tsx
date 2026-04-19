import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Reveal } from "@/components/landing/Reveal";

/* ─── Static data ─────────────────────────────────────────── */
const CAPS = [
  {
    n: "01",
    title: "Evidence-grounded answers",
    desc: "Hybrid retrieval and reranking surfaces the right passages. The agent writes with citations baked in — not retrofitted after the fact.",
  },
  {
    n: "02",
    title: "Explain at three depths",
    desc: "Simple, intermediate, advanced — keep different explanations side-by-side without losing prior context or starting over.",
  },
  {
    n: "03",
    title: "Practice built-in",
    desc: "Generate quizzes and flashcards that adhere precisely to your material. Not generic fill-in-the-blank — your content, your language.",
  },
  {
    n: "04",
    title: "Exportable artifacts",
    desc: "Save outputs as Markdown, CSV, or PDF and drop them into your existing workflow without any reformatting or copy-paste.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Upload documents",
    desc: "PDF, DOCX, TXT, CSV — indexed privately inside the session. Nothing leaves your machine.",
  },
  {
    n: "02",
    title: "Request an output",
    desc: "Explain, quiz, flashcard, plan — intent is routed automatically. No manual mode-switching required.",
  },
  {
    n: "03",
    title: "Export and continue",
    desc: "Artifacts persist across refreshs. Pick up exactly where you left off without starting over.",
  },
];

/* ─── Reusable primitives ────────────────────────────────── */
function Mark({ large = false }: { large?: boolean }) {
  const box = large ? "h-8 w-8 rounded-lg" : "h-6 w-6 rounded-md";
  const icon = large ? 16 : 12;
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex ${box} items-center justify-center bg-[var(--ax-text)]`}>
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ax-accent-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      </div>
      <span
        className={
          large
            ? "ax-syne text-base font-semibold tracking-tight"
            : "ax-syne text-sm font-semibold tracking-tight"
        }
      >
        Axios
      </span>
    </div>
  );
}

function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-text)] overflow-x-hidden">

      {/* ══ Fonts + all custom styles ════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,700&family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        .ax-fraunces { font-family: 'Fraunces', 'Georgia', serif; }
        .ax-syne     { font-family: 'Syne', system-ui, sans-serif; }
        .ax-mono     { font-family: 'DM Mono', 'Fira Mono', monospace; }

        /* ── Animated grid ── */
        @keyframes axGridScroll {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(-80px,-80px,0); }
        }
        .ax-grid {
          background-image:
            linear-gradient(to right,  rgba(0,0,0,0.042) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.042) 1px, transparent 1px);
          background-size: 80px 80px;
          animation: axGridScroll 32s linear infinite;
          will-change: transform;
        }
        .dark .ax-grid {
          background-image:
            linear-gradient(to right,  rgba(255,255,255,0.055) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px);
        }

        /* ── Film grain ── */
        .ax-grain {
          opacity: 0.024;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          background-repeat: repeat;
        }
        .dark .ax-grain { opacity: 0.042; }

        /* ── Pulse dot ── */
        @keyframes axPulse {
          0%,100% { opacity:1;  transform:scale(1); }
          50%      { opacity:.3; transform:scale(.8); }
        }
        .ax-pulse { animation: axPulse 2.6s ease-in-out infinite; }

        /* ── Marquee ── */
        @keyframes axMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ax-marquee { display:flex; width:max-content; animation:axMarquee 28s linear infinite; }

        /* ── Hover lift ── */
        .ax-lift { transition:transform 240ms cubic-bezier(.34,1.56,.64,1); }
        .ax-lift:hover { transform:translateY(-3px); }

        /* ── 3-D card ── */
        .ax-card-3d {
          transform: perspective(1400px) rotateX(3deg) rotateY(-4deg);
          transition: transform 500ms cubic-bezier(.22,.68,0,1.2), box-shadow 500ms ease;
        }
        .ax-card-3d:hover {
          transform: perspective(1400px) rotateX(.8deg) rotateY(-1deg) translateY(-8px);
        }

        /* ── Layered shadow ── */
        .ax-shadow-deep {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.07),
            0 2px  4px  rgba(0,0,0,.04),
            0 8px  20px rgba(0,0,0,.06),
            0 28px 64px rgba(0,0,0,.09);
        }
        .dark .ax-shadow-deep {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.04),
            0 2px  8px  rgba(0,0,0,.25),
            0 16px 40px rgba(0,0,0,.32),
            0 36px 80px rgba(0,0,0,.22);
        }

        /* ── Capability index rows ── */
        .ax-cap-row {
          display: grid;
          grid-template-columns: 2.75rem 1.05fr 1.4fr 1.5rem;
          align-items: center;
          gap: 2rem;
          padding: 1.5rem 1rem;
          border-top: 1px solid var(--ax-border);
          border-radius: 6px;
          cursor: default;
          transition: background 180ms ease, padding-left 180ms ease;
        }
        .ax-cap-row:last-child { border-bottom: 1px solid var(--ax-border); }
        .ax-cap-row:hover { background: var(--ax-surface); padding-left: 1.5rem; }
        .ax-row-arrow {
          color: var(--ax-text-tertiary);
          transition: transform 200ms ease, color 200ms ease;
        }
        .ax-cap-row:hover .ax-row-arrow { transform:translate(2px,-2px); color:var(--ax-text); }
        @media (max-width:768px) {
          .ax-cap-row {
            grid-template-columns: 2rem 1fr 1.25rem;
            gap: 0.75rem;
            padding: 1.1rem 0.75rem;
          }
          .ax-cap-desc { display:none; }
        }

        /* ── Workflow step bg number ── */
        .ax-step-num-bg {
          font-family: 'Fraunces', Georgia, serif;
          font-style: italic;
          font-size: 8.5rem;
          font-weight: 700;
          line-height: .85;
          position: absolute;
          top: .75rem;
          right: 1rem;
          color: var(--ax-border);
          user-select: none;
          pointer-events: none;
          transition: color 280ms ease;
        }
        .ax-step-card:hover .ax-step-num-bg { color: var(--ax-border-strong); }

        /* ── CTA ghost text ── */
        .ax-cta-ghost {
          font-family: 'Fraunces', Georgia, serif;
          font-style: italic;
          font-size: clamp(4.5rem, 13vw, 11rem);
          font-weight: 700;
          line-height: .88;
          color: var(--ax-border);
          user-select: none;
          pointer-events: none;
          white-space: nowrap;
        }

        /* ── Citation left accent ── */
        .ax-cite { border-left: 2px solid var(--ax-border-strong); }

        /* ── Short rule ── */
        .ax-rule { height:1px; background:var(--ax-border); }

        /* ══════════════════════════════════════════
           FIX 1 — Hero title: fluid from 1.85rem → 4.75rem
           ══════════════════════════════════════════ */
        .ax-hero-title {
          /* Fluid clamp: ~1.9rem on 320px, ~4.75rem on 1280px+ */
          font-size: clamp(1.9rem, 6.5vw + 0.5rem, 4.75rem) !important;
          line-height: 1.07 !important;
        }

        /* ══════════════════════════════════════════
           FIX 2 — Stats: single column on narrow (<480px)
           ══════════════════════════════════════════ */
        @media (max-width: 479px) {
          .ax-stats-grid {
            grid-template-columns: 1fr !important;
            divide-x: none !important;
          }
          .ax-stats-grid > * {
            border-left: none !important;
            border-top: 1px solid var(--ax-border);
          }
          .ax-stats-grid > *:first-child {
            border-top: none;
          }
          .ax-stats-cell {
            flex-direction: row !important;
            gap: 0.75rem !important;
            justify-content: flex-start !important;
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
            padding-left: 1.5rem !important;
          }
          .ax-stats-val {
            font-size: 1.65rem !important;
          }
          .ax-stats-label {
            margin-top: 0 !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 3 — Editorial quote: smaller on mobile
           ══════════════════════════════════════════ */
        .ax-editorial-quote {
          font-size: clamp(1.55rem, 5vw + 0.25rem, 3rem);
        }

        /* ══════════════════════════════════════════
           FIX 4 — Section headings: fluid scale
           ══════════════════════════════════════════ */
        .ax-sec-title {
          font-size: clamp(2rem, 5vw + 0.5rem, 3.25rem) !important;
        }

        /* ══════════════════════════════════════════
           FIX 5 — CTA heading: fluid
           ══════════════════════════════════════════ */
        .ax-cta-heading {
          font-size: clamp(1.85rem, 5.5vw + 0.5rem, 3.75rem);
        }

        /* ══════════════════════════════════════════
           FIX 6 — Product card: constrain on mobile
           ══════════════════════════════════════════ */
        .ax-prod-card-wrap {
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 479px) {
          .ax-prod-card {
            /* Slightly tighten inner chrome on very small phones */
            border-radius: 1rem !important;
          }
          .ax-prod-card .ax-prod-card-body {
            padding: 0.875rem !important;
          }
          .ax-prod-tabs button {
            padding-left: 0.55rem !important;
            padding-right: 0.55rem !important;
            font-size: 0.6rem !important;
          }
          .ax-prod-footer {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }
        }

        /* ══════════════════════════════════════════
           FIX 7 — Hero hero CTA buttons: stack on xs
           ══════════════════════════════════════════ */
        @media (max-width: 400px) {
          .ax-hero-btn-group {
            flex-direction: column !important;
          }
          .ax-hero-btn-group a {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 8 — Hero subtitle: full width on mobile
           ══════════════════════════════════════════ */
        @media (max-width: 640px) {
          .ax-hero-sub {
            max-width: 100% !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 9 — Navbar: tighter on small screens
           ══════════════════════════════════════════ */
        @media (max-width: 400px) {
          .ax-nav-inner {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .ax-nav-cta {
            padding-left: 0.7rem !important;
            padding-right: 0.7rem !important;
            font-size: 0.72rem !important;
          }
          /* Hide the CTA arrow text on very small screens, keep icon */
          .ax-nav-cta-label { display: none; }
        }

        /* ══════════════════════════════════════════
           FIX 10 — Hero section padding
           ══════════════════════════════════════════ */
        @media (max-width: 479px) {
          .ax-hero {
            padding-top: 4.5rem !important;
            padding-bottom: 3rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 11 — Section padding reduction on mobile
           ══════════════════════════════════════════ */
        @media (max-width: 479px) {
          .ax-section-inner {
            padding-top: 3.5rem !important;
            padding-bottom: 3.5rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .ax-section-head-mb {
            margin-bottom: 2.25rem !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 12 — Step cards on mobile
           ══════════════════════════════════════════ */
        @media (max-width: 479px) {
          .ax-step-card {
            padding-top: 3.25rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
            padding-bottom: 1.75rem !important;
          }
          .ax-step-num-bg {
            font-size: 6.5rem !important;
            right: 0.75rem !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 13 — CTA section padding on mobile
           ══════════════════════════════════════════ */
        @media (max-width: 479px) {
          .ax-cta-inner {
            padding-top: 4rem !important;
            padding-bottom: 4rem !important;
          }
          .ax-cta-ghost {
            font-size: 4.5rem !important;
          }
          .ax-cta-btn-group {
            flex-direction: column !important;
          }
          .ax-cta-btn-group a {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        /* ══════════════════════════════════════════
           FIX 14 — Chips wrap cleanly on all sizes
           ══════════════════════════════════════════ */
        @media (max-width: 400px) {
          .ax-hero-chips {
            gap: 0.4rem !important;
          }
          .ax-hero-chip {
            font-size: 0.6rem !important;
            padding-left: 0.6rem !important;
            padding-right: 0.6rem !important;
          }
        }

        @media (prefers-reduced-motion:reduce) {
          .ax-grid,.ax-marquee,.ax-pulse { animation:none !important; }
          .ax-card-3d { transform:none !important; transition:none !important; }
        }
      `}</style>

      {/* Ambient grid */}
      <div aria-hidden="true" className="ax-grid pointer-events-none fixed inset-0 -z-20 opacity-55 dark:opacity-35" />
      {/* Grain */}
      <div aria-hidden="true" className="ax-grain pointer-events-none fixed inset-0 -z-10" />
      {/* Radial vignette */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(ellipse 90% 55% at 50% 0%, transparent 10%, var(--ax-bg) 80%)" }} />

      {/* ════════════════════════════════════════════════════ */}
      {/* NAVBAR                                              */}
      {/* ════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-40 border-b border-[var(--ax-border)] bg-[var(--ax-bg)]/80 backdrop-blur-xl">
        {/* FIX 9: tighter padding class on xs via CSS */}
        <div className="ax-nav-inner mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="ax-lift"><Mark /></div>

          <div className="hidden items-center gap-1 md:flex">
            {[{ label: "Capabilities", href: "#capabilities" }, { label: "Workflow", href: "#workflow" }].map((l) => (
              <Link key={l.label} href={l.href} className="ax-mono rounded-md px-3.5 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.13em] text-[var(--ax-text-tertiary)] transition-colors hover:bg-[var(--ax-surface)] hover:text-[var(--ax-text)]">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/workspace" className="ax-nav-cta ax-lift ax-syne inline-flex items-center gap-1.5 rounded-md bg-[var(--ax-text)] px-4 py-2 text-[0.8125rem] font-semibold text-[var(--ax-accent-fg)]">
              {/* FIX 9: hide label text on very small screens, keep icon */}
              <span className="ax-nav-cta-label">Open workspace</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════ */}
      {/* HERO                                                */}
      {/* ════════════════════════════════════════════════════ */}
      {/* FIX 10: ax-hero class for responsive padding */}
      <header className="ax-hero relative mx-auto max-w-6xl px-5 pt-20 pb-14 sm:px-6 md:pt-32 md:pb-20">
        {/* Faded star watermark */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-8 select-none opacity-[0.035] dark:opacity-[0.06]">
          <svg width="440" height="440" viewBox="0 0 24 24" fill="var(--ax-text)" aria-hidden="true">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </div>

        {/* FIX 6: right column gets ax-prod-card-wrap */}
        <div className="grid gap-10 md:grid-cols-[1fr_400px] md:items-start md:gap-14">

          {/* LEFT */}
          <div>
            <Reveal delayMs={0}>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3.5 py-1.5 shadow-[var(--ax-shadow-sm)]">
                <span className="ax-pulse h-1.5 w-1.5 rounded-full bg-[var(--ax-success)]" />
              </div>
            </Reveal>

            <Reveal delayMs={65}>
              {/* FIX 1: ax-hero-title now uses clamp() via CSS */}
              <h1 className="ax-hero-title ax-fraunces mt-6 font-light leading-[1.06] tracking-[-0.03em]">
                Understand<br />
                <em className="font-normal" style={{ fontVariationSettings: "'opsz' 72" }}>complex documents</em><br />
                with structured<br />
                <em className="font-normal text-[var(--ax-text-secondary)]">outputs.</em>
              </h1>
            </Reveal>

            <Reveal delayMs={130}>
              {/* FIX 8: ax-hero-sub removes max-w on mobile via CSS */}
              <p className="ax-hero-sub ax-syne mt-6 max-w-[21rem] text-[0.9125rem] leading-[1.85] text-[var(--ax-text-secondary)]">
                Axios turns your files into explanations, quizzes, flashcards, and study plans. No noisy dashboards — just a clean workspace for thinking.
              </p>
            </Reveal>

            <Reveal delayMs={200}>
              {/* FIX 7: ax-hero-btn-group stacks on xs */}
              <div className="ax-hero-btn-group mt-7 flex flex-wrap items-center gap-3">
                <Link href="/workspace" className="ax-lift ax-syne inline-flex items-center gap-2 rounded-md bg-[var(--ax-text)] px-6 py-2.5 text-[0.875rem] font-semibold text-[var(--ax-accent-fg)] shadow-[var(--ax-shadow-sm)]">
                  Open workspace
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <Link href="#workflow" className="ax-lift ax-syne inline-flex items-center gap-2 rounded-md border border-[var(--ax-border)] bg-[var(--ax-surface)] px-6 py-2.5 text-[0.875rem] font-medium text-[var(--ax-text)] hover:border-[var(--ax-border-strong)]">
                  How it works
                </Link>
              </div>
            </Reveal>

            <Reveal delayMs={265}>
              {/* FIX 14: ax-hero-chips / ax-hero-chip classes for xs */}
              <div className="ax-hero-chips mt-7 flex flex-wrap gap-2">
                {[
                  "RAG over your docs",
                  "Multi-agent routing",
                  "Exportable outputs",
                ].map((t) => (
                  <span
                    key={t}
                    className="ax-hero-chip ax-mono rounded-full border border-[var(--ax-border)] px-3 py-1 text-[0.67rem] text-[var(--ax-text-tertiary)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* RIGHT — 3-D product card
              FIX 6: ax-prod-card-wrap ensures w-full on mobile */}
          <Reveal delayMs={150} className="ax-prod-card-wrap md:pt-2">
            <div className="ax-prod-card ax-card-3d ax-shadow-deep w-full rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-surface)] overflow-hidden">
              {/* Chrome */}
              <div className="flex items-center justify-between border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-4 py-3">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => <div key={i} className="h-2.5 w-2.5 rounded-full bg-[var(--ax-border-strong)] opacity-40" />)}
                </div>
                {/* Hide long label on very small screens */}
                <span className="ax-mono hidden text-[0.62rem] uppercase tracking-widest text-[var(--ax-text-tertiary)] xs:block sm:block">workspace / explain</span>
                <span className="ax-pulse h-1.5 w-1.5 rounded-full bg-[var(--ax-success)]" />
              </div>
              {/* Mode tabs */}
              <div className="ax-prod-tabs flex items-center border-b border-[var(--ax-border)] bg-[var(--ax-bg)] px-3">
                {"Explain Quiz Flashcards Plan".split(" ").map((m, i) => (
                  <button key={m} className={"ax-mono px-3 py-2.5 text-[0.66rem] font-medium transition-colors border-b-[1.5px] " + (i===0 ? "border-[var(--ax-text)] text-[var(--ax-text)]" : "border-transparent text-[var(--ax-text-tertiary)] hover:text-[var(--ax-text-secondary)]")}>
                    {m}
                  </button>
                ))}
              </div>
              {/* Body — FIX 6: ax-prod-card-body for xs padding override */}
              <div className="ax-prod-card-body space-y-4 p-5">
                {/* File chip */}
                <div className="flex items-center gap-2 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-3 py-2">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--ax-text-tertiary)]" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="ax-mono text-[0.67rem] text-[var(--ax-text-secondary)]">Q3_Report.pdf</span>
                  <span className="ax-mono ml-auto text-[0.62rem] text-[var(--ax-text-tertiary)]">2.4 MB</span>
                </div>
                {/* Skeleton */}
                <div className="space-y-2.5 pt-1">
                  <div className="h-[7px] w-[95%] rounded-full bg-[var(--ax-border)] opacity-60" />
                  <div className="h-[7px] w-[87%] rounded-full bg-[var(--ax-border)] opacity-52" />
                  <div className="h-[7px] w-[92%] rounded-full bg-[var(--ax-border)] opacity-46" />
                </div>
                {/* Citation block */}
                <div className="ax-cite rounded-r-lg bg-[var(--ax-surface-subtle)] p-3 pl-3.5">
                  <p className="ax-mono mb-1.5 text-[0.61rem] uppercase tracking-[0.1em] text-[var(--ax-text-tertiary)]">Source citations</p>
                  <div className="space-y-1.5">
                    <div className="h-[6px] w-[82%] rounded-full bg-[var(--ax-border)] opacity-50" />
                    <div className="h-[6px] w-[68%] rounded-full bg-[var(--ax-border)] opacity-42" />
                  </div>
                  <p className="ax-mono mt-2 text-[0.61rem] text-[var(--ax-text-tertiary)]">p.7 · p.12 · p.19</p>
                </div>
                {/* More skeleton */}
                <div className="space-y-2">
                  <div className="h-[7px] w-[76%] rounded-full bg-[var(--ax-border)] opacity-36" />
                  <div className="h-[7px] w-[58%] rounded-full bg-[var(--ax-border)] opacity-28" />
                </div>
              </div>
              {/* Footer toolbar — FIX 6: ax-prod-footer for xs stacking */}
              <div className="ax-prod-footer flex items-center justify-between border-t border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="ax-mono text-[0.61rem] text-[var(--ax-text-tertiary)]">Depth:</span>
                  {["Simple","Intermediate","Advanced"].map((d,i) => (
                    <span key={d} className={"ax-mono rounded px-1.5 py-0.5 text-[0.59rem] " + (i===1 ? "border border-[var(--ax-border)] bg-[var(--ax-bg)] text-[var(--ax-text-secondary)]" : "text-[var(--ax-text-tertiary)]")}>{d}</span>
                  ))}
                </div>
                <div className="flex gap-1">
                  {["md","pdf","csv"].map(f => <span key={f} className="ax-mono rounded border border-[var(--ax-border)] px-1.5 py-0.5 text-[0.59rem] text-[var(--ax-text-tertiary)]">{f}</span>)}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════ */}
      {/* STATS BAR                                           */}
      {/* ════════════════════════════════════════════════════ */}
      {/* FIX 2: ax-stats-grid for responsive single-col on mobile */}
      <div className="border-y border-[var(--ax-border)] bg-[var(--ax-surface]">
        <div className="mx-auto max-w-6xl">
          <div className="ax-stats-grid grid grid-cols-3 divide-x divide-[var(--ax-border)]">
            {[
              { val:"4",    unit:"output modes" },
              { val:"0",    unit:"signups required" },
              { val:"100%", unit:"local & private" },
            ].map(s => (
              <div key={s.unit} className="ax-stats-cell flex flex-col items-center justify-center gap-1 px-4 py-6 sm:px-6 sm:py-7">
                <span className="ax-stats-val ax-fraunces text-[2.25rem] font-light leading-none tracking-[-0.03em]">{s.val}</span>
                <span className="ax-stats-label ax-mono mt-1 text-[0.66rem] uppercase tracking-[0.15em] text-[var(--ax-text-tertiary)]">{s.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* MARQUEE                                              */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="overflow-hidden border-b border-[var(--ax-border)] bg-[var(--ax-bg)] py-3" aria-hidden="true">
        <div className="ax-marquee">
          {[...Array(2)].map((_,p) => (
            <div key={p} className="flex items-center gap-10 pr-10">
              {["RAG retrieval","Hybrid reranking","Session-scoped state","Evidence citations","Export to PDF","Quiz generation","Flashcard synthesis","Three-depth explain","Multi-agent routing","Local-first architecture"].map(t => (
                <span key={t} className="ax-mono flex items-center gap-3 whitespace-nowrap text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[var(--ax-text-tertiary)]">
                  <span className="inline-block h-px w-3.5 bg-[var(--ax-border-strong)]" />{t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* CAPABILITIES                                         */}
      {/* ════════════════════════════════════════════════════ */}
      <section id="capabilities" className="bg-[var(--ax-bg)]">
        {/* FIX 11: ax-section-inner for responsive padding */}
        <div className="ax-section-inner mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-32">
          <Reveal>
            {/* FIX 11: ax-section-head-mb for responsive margin */}
            <div className="ax-section-head-mb mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="ax-mono text-[0.67rem] font-medium uppercase tracking-[0.2em] text-[var(--ax-text-tertiary)]">02 — Capabilities</p>
                {/* FIX 4: ax-sec-title uses clamp via CSS */}
                <h2 className="ax-sec-title ax-fraunces mt-3 font-light leading-[1.08] tracking-[-0.025em]">
                  Designed around<br /><em>outputs.</em>
                </h2>
              </div>
              <p className="hidden max-w-[22rem] text-[0.875rem] leading-[1.85] text-[var(--ax-text-secondary)] md:block">
                Not a generic chat UI. Axios routes intent, retrieves evidence from your documents, and produces assets you can actually use.
              </p>
            </div>
          </Reveal>

          <div>
            {CAPS.map((c, idx) => (
              <Reveal key={c.n} delayMs={idx * 50}>
                <div className="ax-cap-row group">
                  <span className="ax-mono text-[0.67rem] text-[var(--ax-text-tertiary)]">{c.n}</span>
                  <span className="ax-syne text-[0.9375rem] font-semibold leading-snug text-[var(--ax-text)]">{c.title}</span>
                  <span className="ax-cap-desc text-[0.875rem] leading-[1.8] text-[var(--ax-text-secondary)]">{c.desc}</span>
                  <ArrowUpRight className="ax-row-arrow shrink-0" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* EDITORIAL BREAK                                      */}
      {/* ════════════════════════════════════════════════════ */}
      <section className="border-y border-[var(--ax-border)] bg-[var(--ax-surface)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="ax-rule mx-auto mb-10 w-16" />
              {/* FIX 3: ax-editorial-quote uses clamp via CSS */}
              <blockquote className="ax-editorial-quote ax-fraunces font-light italic leading-[1.18] tracking-[-0.025em]">
                &quot;Not a chat interface.<br />A precision instrument.&quot;
              </blockquote>
              <div className="ax-rule mx-auto mt-10 w-16" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* WORKFLOW                                             */}
      {/* ════════════════════════════════════════════════════ */}
      <section id="workflow" className="bg-[var(--ax-bg)]">
        <div className="ax-section-inner mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-32">
          <Reveal>
            <div className="ax-section-head-mb mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="ax-mono text-[0.67rem] font-medium uppercase tracking-[0.2em] text-[var(--ax-text-tertiary)]">03 — Workflow</p>
                {/* FIX 4 */}
                <h2 className="ax-sec-title ax-fraunces mt-3 font-light leading-[1.08] tracking-[-0.025em]">
                  Upload. Ask.<br /><em>Export.</em>
                </h2>
              </div>
              <p className="hidden max-w-[22rem] text-[0.875rem] leading-[1.85] text-[var(--ax-text-secondary)] md:block">
                Keep work session-scoped. Switch modes without losing progress. Refresh without losing state.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {STEPS.map((s, idx) => (
              <Reveal key={s.n} delayMs={idx * 80}>
                {/* FIX 12: ax-step-card for xs via CSS */}
                <div className="ax-step-card ax-lift relative overflow-hidden rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-surface)] px-6 pb-7 pt-14 shadow-[var(--ax-shadow-sm)] sm:px-7 sm:pb-8">
                  <span className="ax-step-num-bg" aria-hidden="true">{s.n}</span>
                  <div className="relative">
                    <p className="ax-mono text-[0.66rem] font-medium uppercase tracking-[0.15em] text-[var(--ax-text-tertiary)]">{s.n}</p>
                    <h3 className="ax-syne mt-2.5 text-[1rem] font-semibold leading-snug tracking-[-0.01em]">{s.title}</h3>
                    <p className="mt-3 text-[0.875rem] leading-[1.8] text-[var(--ax-text-secondary)]">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* CTA                                                  */}
      {/* ════════════════════════════════════════════════════ */}
      <section className="overflow-hidden border-t border-[var(--ax-border)] bg-[var(--ax-surface)]">
        {/* FIX 13: ax-cta-inner for xs padding via CSS */}
        <div className="ax-cta-inner relative mx-auto max-w-6xl px-5 py-24 text-center sm:px-6 md:py-36">
          {/* Ghost text */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none opacity-70">
            {/* FIX 13: ax-cta-ghost uses clamp + xs override via CSS */}
            <span className="ax-cta-ghost">Axion</span>
          </div>
          <div className="relative">
            <Reveal>
              <p className="ax-mono text-[0.67rem] font-medium uppercase tracking-[0.2em] text-[var(--ax-text-tertiary)]">04 — Get started</p>
            </Reveal>
            <Reveal delayMs={80}>
              {/* FIX 5: ax-cta-heading uses clamp via CSS */}
              <h2 className="ax-cta-heading ax-fraunces mx-auto mt-5 max-w-2xl font-light leading-[1.1] tracking-[-0.025em]">
                A workspace built for<br /><em>serious thinking.</em>
              </h2>
            </Reveal>
            <Reveal delayMs={150}>
              <p className="ax-syne mx-auto mt-6 max-w-sm text-[0.9rem] leading-[1.85] text-[var(--ax-text-secondary)]">
                No signup. Your sessions, documents, and generated materials persist locally and can be restored from the API when available.
              </p>
            </Reveal>
            <Reveal delayMs={220}>
              {/* FIX 13: ax-cta-btn-group stacks on xs */}
              <div className="ax-cta-btn-group mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/workspace" className="ax-lift ax-syne inline-flex items-center gap-2 rounded-md bg-[var(--ax-text)] px-8 py-3.5 text-[0.875rem] font-semibold text-[var(--ax-accent-fg)] shadow-[var(--ax-shadow-sm)]">
                  Open workspace
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <Link href="#capabilities" className="ax-lift ax-syne inline-flex items-center gap-2 rounded-md border border-[var(--ax-border)] bg-[var(--ax-bg)] px-8 py-3.5 text-[0.875rem] font-medium text-[var(--ax-text)] hover:border-[var(--ax-border-strong)]">
                  See capabilities
                </Link>
              </div>
            </Reveal>
            <Reveal delayMs={280}>
              <p className="ax-mono mt-7 text-[0.65rem] uppercase tracking-[0.13em] text-[var(--ax-text-tertiary)]">
                No account required · Documents never leave your session · Export anytime
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* FOOTER                                               */}
      {/* ════════════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--ax-border)] bg-[var(--ax-bg)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-6 sm:py-7">
          <Mark />
          <div className="flex items-center gap-4">
            <span className="ax-mono text-[0.65rem] uppercase tracking-[0.13em] text-[var(--ax-text-tertiary)]">v1.0 · Beta</span>
            <span className="inline-block h-3 w-px bg-[var(--ax-border)]" aria-hidden="true" />
            <p className="ax-mono text-[0.65rem] text-[var(--ax-text-tertiary)]">© {new Date().getFullYear()} Axios. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="ax-pulse h-1.5 w-1.5 rounded-full bg-[var(--ax-success)]" />
            <span className="ax-mono text-[0.64rem] text-[var(--ax-text-tertiary]">All systems operational</span>
          </div>
        </div>
      </footer>

    </div>
  );
}