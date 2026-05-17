import { useCallback, useEffect, useState } from "react";

export type GalleryGuestMediaItem = {
  id: string;
  object_path: string;
  original_name: string;
  created_at: string;
  signedUrl: string | null;
  source: "guest";
};

export function useGalleryAlbumMedia(albumId: string | null) {
  const [items, setItems] = useState<GalleryGuestMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!albumId) {
      setItems([]);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const res = await fetch(`/api/gallery-media?albumId=${encodeURIComponent(albumId)}`);
        const json = (await res.json().catch(() => ({}))) as {
          items?: GalleryGuestMediaItem[];
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(json?.error?.message ?? "Could not load guest photos.");
          setItems([]);
          return;
        }
        setItems(json.items ?? []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load guest photos.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  return { items, loading, error };
}

export function useGalleryAlbumCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetch("/api/gallery-media?counts=1")
      .then(async res => {
        const json = (await res.json().catch(() => ({}))) as { counts?: Record<string, number> };
        if (res.ok) setCounts(json.counts ?? {});
      })
      .catch(() => setCounts({}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { counts, loading, refresh };
}
