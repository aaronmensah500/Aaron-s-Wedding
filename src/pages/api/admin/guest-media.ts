import type { APIRoute } from "astro";
import { authorizeAdminRequest } from "../../../lib/adminAuthServer";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../lib/api/json";
import { WEDDING_SLUG } from "../../../lib/weddingSlug";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const auth = (request.headers.get("Authorization") ?? "").trim();
  if (!(await authorizeAdminRequest(auth))) {
    return jsonError("UNAUTHORIZED", 401, "Admin access required.");
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, "Supabase is not configured.");
  }

  const albumId = url.searchParams.get("albumId")?.trim() || null;

  let query = service
    .from("guest_media")
    .select("id,object_path,original_name,album_id,created_at")
    .eq("wedding_slug", WEDDING_SLUG)
    .order("created_at", { ascending: false });

  if (albumId) {
    query = query.eq("album_id", albumId);
  }

  const { data, error } = await query;
  if (error) return jsonError("load_failed", 500, error.message);

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
        album_id: row.album_id,
        created_at: row.created_at,
        signedUrl: signed?.signedUrl ?? null,
        source: "guest" as const,
      };
    })
  );

  return jsonOk({ items });
};

export const DELETE: APIRoute = async ({ request }) => {
  const auth = (request.headers.get("Authorization") ?? "").trim();
  if (!(await authorizeAdminRequest(auth))) {
    return jsonError("UNAUTHORIZED", 401, "Admin access required.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BAD_REQUEST", 400, "Invalid JSON body.");
  }

  const raw = (body as { ids?: unknown })?.ids;
  const ids: string[] = Array.isArray(raw)
    ? (raw.filter(id => typeof id === "string") as string[])
    : [];

  if (!ids.length) {
    return jsonError("BAD_REQUEST", 400, "No IDs provided.");
  }

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return jsonError("server_misconfigured", 503, "Supabase is not configured.");
  }

  const { data: rows, error: fetchError } = await service
    .from("guest_media")
    .select("id,object_path")
    .in("id", ids)
    .eq("wedding_slug", WEDDING_SLUG);

  if (fetchError) return jsonError("fetch_failed", 500, fetchError.message);

  const paths = (rows || []).map(r => r.object_path);
  if (paths.length) {
    await service.storage.from("guest-media").remove(paths);
  }

  const { error: deleteError } = await service
    .from("guest_media")
    .delete()
    .in("id", ids)
    .eq("wedding_slug", WEDDING_SLUG);

  if (deleteError) return jsonError("delete_failed", 500, deleteError.message);

  return jsonOk({ deleted: ids.length });
};
