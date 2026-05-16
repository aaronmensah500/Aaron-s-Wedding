import type { APIRoute } from "astro";
import { jsonError, jsonOk } from "../../lib/api/json";
import { getServiceSupabase } from "../../lib/supabase/service";
import { WEDDING_SLUG } from "../../lib/weddingSlug";

export const prerender = false;

/** Table not created yet, or project missing migration — treat as “no published copy”. */
function isMissingSiteContentTable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("wedding_site_content") &&
    (m.includes("does not exist") ||
      m.includes("could not find") ||
      m.includes("schema cache") ||
      m.includes("relation"))
  );
}

function writeToken(): string | undefined {
  return import.meta.env.PUBLIC_SITE_CONTENT_SAVE_TOKEN?.trim() || undefined;
}

export const GET: APIRoute = async () => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("wedding_site_content")
      .select("content, updated_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .maybeSingle();

    if (error) {
      if (isMissingSiteContentTable(error.message)) {
        return jsonOk({ content: null, updatedAt: null });
      }
      return jsonError("DB_ERROR", 500, error.message);
    }
    if (!data?.content) {
      return jsonOk({ content: null, updatedAt: null });
    }
    return jsonOk({
      content: data.content,
      updatedAt: data.updated_at ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MISSING_SUPABASE";
    if (msg === "MISSING_SUPABASE") {
      return jsonError("NOT_CONFIGURED", 503, "Site content storage is not configured.");
    }
    return jsonError("SERVER_ERROR", 500, msg);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const token = writeToken();
  if (!token) {
    return jsonError("NOT_CONFIGURED", 503, "Site content publishing is not configured.");
  }

  const auth = (request.headers.get("Authorization") ?? "").trim();
  if (auth !== `Bearer ${token}`) {
    return jsonError("UNAUTHORIZED", 401, "Invalid save token.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BAD_REQUEST", 400, "Invalid JSON body.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("BAD_REQUEST", 400, "Body must be a JSON object.");
  }

  const content = (body as { content?: unknown }).content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return jsonError("BAD_REQUEST", 400, "Body must include a `content` object.");
  }

  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("wedding_site_content").upsert(
      {
        wedding_slug: WEDDING_SLUG,
        content,
      },
      { onConflict: "wedding_slug" }
    );

    if (error) {
      return jsonError("DB_ERROR", 500, error.message);
    }
    return jsonOk({ published: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MISSING_SUPABASE";
    return jsonError("SERVER_ERROR", 500, msg);
  }
};
