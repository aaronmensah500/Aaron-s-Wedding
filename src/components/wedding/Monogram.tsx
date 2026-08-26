/**
 * The couple's A&P monogram.
 *
 * The artwork is rendered as a CSS *mask* rather than an <img>, so the shape
 * comes from the logo file while the colour comes from `currentColor` — the
 * mark automatically picks up champagne on light sections, ivory on dark ones,
 * with no separate colourways to maintain.
 *
 *   variant="mark" → monogram + crown only (small placements, e.g. the nav)
 *   variant="full" → monogram + "Aaron and Princess" lockup
 */
type MonogramProps = {
  variant?: "mark" | "full";
  className?: string;
  /** Rendered height; width follows the artwork's aspect ratio. */
  height?: number | string;
  title?: string;
};

export function Monogram({
  variant = "mark",
  className = "",
  height,
  title = "Aaron & Princess",
}: MonogramProps) {
  const cls = ["ap-logo", `ap-logo--${variant}`, className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      style={height ? { height: typeof height === "number" ? `${height}px` : height } : undefined}
      role="img"
      aria-label={title}
    />
  );
}
