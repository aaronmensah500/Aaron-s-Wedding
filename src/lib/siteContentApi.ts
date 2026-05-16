/** Load / publish site copy for all visitors (Supabase via `/api/site-content`). */

export type PublishedSiteContent = {
  content: unknown;
  updatedAt: string | null;
};

export async function fetchPublishedSiteContent(): Promise<PublishedSiteContent | null> {
  try {
    const res = await fetch("/api/site-content", { headers: { Accept: "application/json" } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return {
      content: json.content ?? null,
      updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export async function publishSiteContent(content: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = import.meta.env.PUBLIC_SITE_CONTENT_SAVE_TOKEN?.trim();
  if (!token) {
    return { ok: false, message: "Publishing is not configured (missing PUBLIC_SITE_CONTENT_SAVE_TOKEN)." };
  }
  try {
    const res = await fetch("/api/site-content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        json?.error?.message ??
        (typeof json?.error === "string" ? json.error : `Publish failed (${res.status})`);
      return { ok: false, message: String(msg) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Publish failed." };
  }
}
