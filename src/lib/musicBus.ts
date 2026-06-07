/**
 * Tiny coordinator so multiple audio players on the page (the floating button and
 * the home "Our Songs" section) never play over each other. When one starts, it
 * announces; every other player pauses.
 */
export const MUSIC_PLAY_EVENT = "wedding:music-play";

export function announceMusicPlay(sourceId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MUSIC_PLAY_EVENT, { detail: { sourceId } }));
}

export function onOtherMusicPlay(sourceId: string, pause: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ sourceId?: string }>).detail;
    if (detail?.sourceId && detail.sourceId !== sourceId) pause();
  };
  window.addEventListener(MUSIC_PLAY_EVENT, handler);
  return () => window.removeEventListener(MUSIC_PLAY_EVENT, handler);
}
