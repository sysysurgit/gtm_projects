"use client";

import { useRef } from "react";

// A gradient-filled, drop-shadowed badge with a mouse-tracking 3D tilt —
// gives flat lucide-react outline icons a "designed object" feel instead of
// a plain glyph. Takes the already-rendered icon element (not a component
// reference) since this crosses the server/client boundary from page.tsx,
// which can only pass serializable children, not function props.
export function IconBadge({
  children,
  size = "md",
  floatDelay = 0,
}: {
  children: React.ReactNode;
  size?: "sm" | "md";
  floatDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${(-py * 18).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * 18).toFixed(2)}deg`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  const dims = size === "sm" ? "h-11 w-11" : "h-14 w-14";

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`icon-badge icon-badge-float ${dims}`}
      style={{ animationDelay: `${floatDelay}s` }}
    >
      {children}
    </div>
  );
}
