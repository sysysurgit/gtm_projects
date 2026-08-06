// A flat icon tile in a subtly-bordered rounded square — deliberately
// minimal (no gradient, no 3D tilt) to match the design system minimal (flat, sans dégradé)
// system, where color is reserved for text/borders, not icon containers.
export function IconBadge({
  children,
  size = "md",
  floatDelay = 0,
}: {
  children: React.ReactNode;
  size?: "sm" | "md";
  floatDelay?: number;
}) {
  const dims = size === "sm" ? "h-11 w-11" : "h-14 w-14";

  return (
    <div className={`icon-tile icon-tile-float ${dims}`} style={{ animationDelay: `${floatDelay}s` }}>
      {children}
    </div>
  );
}
