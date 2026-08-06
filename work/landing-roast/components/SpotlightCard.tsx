"use client";

import { useRef } from "react";

export function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (raf.current) return; // rAF-throttled, per web-design skill's perf guidance
    raf.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
      raf.current = null;
    });
  }

  return (
    <div ref={ref} onMouseMove={handleMove} className={`spotlight-card ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
