import type { APIRoute } from "astro";
import { authorizeAdminRequest } from "../../../lib/adminAuthServer";
import { getServiceSupabase } from "../../../lib/supabase/service";
import { jsonError, jsonOk } from "../../../lib/api/json";

export const prerender = false;

const BUCKET = "admin-media";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export const POST: APIRoute = async ({ request }) => {
  const auth = (request.headers.get("Authorization") ?? "").trim();
  if (!(await authorizeAdminRequest(auth))) {
    return jsonError("UNAUTHORIZED", 401, "Unlock the editor with your PIN, then try again.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("BAD_REQUEST", 400, "Could not parse form data.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("NO_FILE", 400, "No file provided.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError("INVALID_TYPE", 400, "Only JPEG, PNG, WebP, GIF, and AVIF images are allowed.");
  }

  if (file.size > MAX_BYTES) {
    return jsonError("TOO_LARGE", 413, "File exceeds the 10 MB limit.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch {
    return jsonError("UPLOAD_NOT_CONFIGURED", 503, "Supabase is not configured.");
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return jsonError("STORAGE_ERROR", 500, uploadError.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return jsonOk({ url: data.publicUrl });
};
