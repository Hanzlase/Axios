"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
            break;
          }
        }
      },
      { root: null, threshold: 0.12, rootMargin: "-10% 0px -10% 0px" },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ax-reveal ${shown ? "ax-reveal--shown" : ""} ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}

      {/* Component-local CSS so landing can stay a Server Component */}
      <style>{`
        .ax-reveal {
          opacity: 0;
          transform: translate3d(0, 10px, 0);
          filter: blur(6px);
          transition:
            opacity 600ms cubic-bezier(0.2, 0.8, 0.2, 1),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1),
            filter 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .ax-reveal--shown {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          filter: blur(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .ax-reveal {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
