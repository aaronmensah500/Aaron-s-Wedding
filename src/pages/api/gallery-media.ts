import type { APIRoute } from "astro";
import { jsonError, jsonOk } from "../../lib/api/json";
import { getServiceSupabase } from "../../lib/supabase/service";
import { WEDDING_SLUG } from "../../lib/weddingSlug";
import { apiErrorMessage } from "../../i18n/en";

export const prerender = false;

function normAlbumId(id: string | null | undefined): string {
  return String(id || "general").trim().toLowerCase();
}

export const GET: APIRoute = async ({ url }) => {
  const countsOnly = url.searchParams.get("counts") === "1";

  if (countsOnly) {
    let service;
    try {
      service = getServiceSupabase();
    } catch {
      return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
    }

    const { data, error } = await service
      .from("guest_media")
      .select("album_id")
      .eq("wedding_slug", WEDDING_SLUG);

    if (error) {
      return jsonError("load_failed", 500, apiErrorMessage("save_failed"));
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const id = normAlbumId(row.album_id);
      counts[id] = (counts[id] || 0) + 1;
    }
    return jsonOk({ counts });
  }

  const albumId = String(url.searchParams.get("albumId") || "").trim();
  if (!albumId) {
    return jsonError("invalid_album", 400, "Missing albumId.");
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, apiErrorMessage("server_misconfigured"));
  }

  const { data, error } = await service
    .from("guest_media")
    .select("id,object_path,original_name,created_at")
    .eq("wedding_slug", WEDDING_SLUG)
    .eq("album_id", albumId)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("load_failed", 500, apiErrorMessage("save_failed"));
  }

  const rows = data || [];
  const items = await Promise.all(
    rows.map(async row => {
      const { data: signed } = await service.storage
        .from("guest-media")
        .createSignedUrl(row.object_path, 3600);
      return {
        id: row.id,
        object_path: row.object_path,
        original_name: row.original_name,
        created_at: row.created_at,
        signedUrl: signed?.signedUrl ?? null,
        source: "guest" as const,
      };
    })
  );

  return jsonOk({ items });
};
