import { useEffect, useState } from "react";

/**
 * Ornamental floral corner flourishes.
 *
 * The artwork is a PNG (black on transparent) used as a CSS *mask*, not an
 * <img> — so the shape comes from the artwork while the colour comes from the
 * palette. That lets the same file render in champagne/burgundy without ever
 * editing the image.
 *
 * Drop the artwork at `public/floral-corner.png`. Until it exists nothing is
 * rendered, so a missing file can never leave a solid coloured block behind.
 */
const FLORAL_SRC = "/floral-corner.png";

export function FloralCorners() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setReady(true);
    };
    img.src = FLORAL_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="floral" aria-hidden>
      <span className="floral__corner floral__corner--tl" />
      <span className="floral__corner floral__corner--tr" />
      <span className="floral__corner floral__corner--bl" />
      <span className="floral__corner floral__corner--br" />
    </div>
  );
}
