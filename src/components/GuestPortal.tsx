import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "../lib/supabase/browser";
import { parseApiErrorCode } from "../lib/api/json";

const WEDDING_SLUG = "primary";

type GuestMediaRow = {
  id: string;
  object_path: string;
  original_name: string;
  created_at: string;
};

type RsvpRow = {
  attendance: string;
  full_name: string;
} | null;

type SignedItem = GuestMediaRow & { signedUrl: string | null };

export default function GuestPortal() {
  const configured = isSupabaseConfigured();
  const sb = configured ? getBrowserSupabase() : null;

  // Avoid `useState<Session | null>` — in .tsx the `<` is parsed as JSX. Use assertions instead.
  const [session, setSession] = useState(null as Session | null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [rsvp, setRsvp] = useState(null as RsvpRow);
  const [items, setItems] = useState([] as SignedItem[]);
  const [loadErr, setLoadErr] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    if (!sb) return;
    void sb.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, [sb]);

  const refreshRsvp = useCallback(async () => {
    if (!sb || !session) return;
    const { data, error } = await sb
      .from("rsvps")
      .select("attendance,full_name")
      .eq("wedding_slug", WEDDING_SLUG)
      .maybeSingle();
    if (error) setLoadErr(error.message);
    else setRsvp(data);
  }, [sb, session]);

  const refreshMedia = useCallback(async () => {
    if (!sb || !session) return;
    setLoadErr("");
    const { data, error } = await sb
      .from("guest_media")
      .select("id,object_path,original_name,created_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .order("created_at", { ascending: false });
    if (error) {
      setLoadErr(error.message);
      setItems([]);
      return;
    }
    const rows = (data || []) as GuestMediaRow[];
    const withUrls: SignedItem[] = await Promise.all(
      rows.map(async row => {
        const { data: signed } = await sb.storage.from("guest-media").createSignedUrl(row.object_path, 3600);
        return { ...row, signedUrl: signed?.signedUrl ?? null };
      })
    );
    setItems(withUrls);
  }, [sb, session]);

  useEffect(() => {
    if (!session) {
      setRsvp(null);
      setItems([]);
      return;
    }
    void refreshRsvp();
    void refreshMedia();
  }, [session, refreshRsvp, refreshMedia]);

  const requestLink = async (e: FormEvent) => {
    e.preventDefault();
    setLoginMsg("");
    setLoginBusy(true);
    try {
      const r = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) {
        const code = parseApiErrorCode(j);
        setLoginMsg(
          code === "not_on_guest_list"
            ? "That email is not on the RSVP list yet. Complete your RSVP first, then come back here."
            : typeof j.error === "object" && j.error !== null && "message" in j.error
              ? String((j.error as { message: unknown }).message)
              : code || "Could not send link."
        );
        return;
      }
      setLoginMsg("Check your email for the magic sign-in link.");
    } finally {
      setLoginBusy(false);
    }
  };

  /** Structural type — avoids `ChangeEvent<...>` / `PascalCase<` ambiguity in .tsx for Vite. */
  const onPickFiles = async (e: { currentTarget: HTMLInputElement }) => {
    const files = e.currentTarget.files;
    if (!sb || !session?.user || !files?.length) return;
    setUploadBusy(true);
    setLoadErr("");
    try {
      const uid = session.user.id;
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          setLoadErr("Each file must be 25MB or smaller.");
          continue;
        }
        const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
        const path = `${uid}/${Date.now()}-${safe}`;
        const { error: upErr } = await sb.storage.from("guest-media").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) {
          setLoadErr(upErr.message);
          continue;
        }
        const { error: insErr } = await sb.from("guest_media").insert({
          wedding_slug: WEDDING_SLUG,
          user_id: uid,
          object_path: path,
          original_name: file.name,
        });
        if (insErr) setLoadErr(insErr.message);
      }
      await refreshMedia();
    } finally {
      setUploadBusy(false);
      e.currentTarget.value = "";
    }
  };

  const signOut = () => void sb?.auth.signOut();

  if (!configured) {
    return (
      <section id="guest-upload" className="section guest-portal guest-portal--off">
        <div className="section__head reveal">
          <div>
            <div className="eyebrow">
              Guest photos <span className="dot" /> Upload
            </div>
            <h2 className="section__title">Coming soon</h2>
          </div>
          <p className="section__lede">
            Guest login and uploads will appear here once Supabase is configured (see <code className="guest-portal__code">.env.example</code>
            ).
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="guest-upload" className="section section--beige guest-portal">
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">
            Guest photos <span className="dot" /> Upload
          </div>
          <h2 className="section__title">
            Share your <em>moments</em>
          </h2>
        </div>
        <p className="section__lede">
          RSVP&apos;d guests can sign in with email to upload photos and short clips for Aaron &amp; Princess. Only attending guests can upload.
        </p>
      </div>

      <div className="guest-portal__card reveal">
        {!session ? (
          <form className="guest-portal__form" onSubmit={requestLink}>
            <div className="eyebrow">Sign in</div>
            <p className="guest-portal__hint">Use the same email you used on your RSVP. We&apos;ll email you a one-time link.</p>
            <div className="field">
              <label htmlFor="guest-login-email">Email</label>
              <input
                id="guest-login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button type="submit" className="btn" disabled={loginBusy}>
              {loginBusy ? "Sending…" : "Email me a sign-in link"} <span className="arrow">→</span>
            </button>
            {loginMsg ? (
              <p className="guest-portal__msg" role="status" aria-live="polite">
                {loginMsg}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="guest-portal__signed">
            <div className="guest-portal__signed-hd">
              <div>
                <div className="eyebrow">Signed in</div>
                <p className="guest-portal__who">
                  {session.user.email}
                  {rsvp?.full_name ? ` · ${rsvp.full_name}` : ""}
                </p>
              </div>
              <button type="button" className="btn btn--ghost" onClick={signOut}>
                Sign out
              </button>
            </div>

            {rsvp?.attendance === "no" ? (
              <p className="guest-portal__hint">Uploads are only available for guests who accepted the invitation. Thank you for letting us know you can&apos;t attend.</p>
            ) : (
              <>
                <div className="guest-portal__upload">
                  <label className="btn btn--gold guest-portal__file-btn">
                    {uploadBusy ? "Uploading…" : "Choose photos or videos"}
                    <input type="file" accept="image/*,video/*" multiple hidden disabled={uploadBusy} onChange={onPickFiles} />
                  </label>
                  <span className="guest-portal__fine">Up to 25MB per file.</span>
                </div>
                {loadErr ? (
                  <p className="guest-portal__err" role="alert">
                    {loadErr}
                  </p>
                ) : null}
                {items.length > 0 ? (
                  <ul className="guest-portal__grid">
                    {items.map(it => (
                      <li key={it.id} className="guest-portal__thumb">
                        {it.signedUrl && /\.(mp4|webm|mov)$/i.test(it.original_name) ? (
                          <video src={it.signedUrl} controls className="guest-portal__media" />
                        ) : it.signedUrl ? (
                          <img src={it.signedUrl} alt="" className="guest-portal__media" loading="lazy" />
                        ) : (
                          <div className="guest-portal__media guest-portal__media--ph">{it.original_name}</div>
                        )}
                        <span className="guest-portal__cap">{it.original_name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="guest-portal__hint">No uploads yet — be the first.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
