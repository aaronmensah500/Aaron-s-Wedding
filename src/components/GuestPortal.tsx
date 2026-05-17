import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "../lib/supabase/browser";
import { parseApiErrorCode } from "../lib/api/json";
import { apiErrorMessage } from "../i18n/en";
import { WEDDING_SLUG } from "../lib/weddingConstants";
import { GuestHostPanel } from "./GuestHostPanel";
import { requestGuestOtp, verifyGuestOtp } from "../lib/guestOtpAuth";
import { useWeddingContent } from "../lib/weddingContent";
import { SITE_PATHS } from "../lib/sitePages";

type GuestMediaRow = {
  id: string;
  object_path: string;
  original_name: string;
  created_at: string;
};

type RsvpRow = {
  attendance: string;
  full_name: string;
  events: string[];
  guests: number;
  diet: string[];
  song: string;
  note: string;
  updated_at: string;
} | null;

type GiftRow = {
  id: string;
  amount_subunit: number;
  currency: string;
  reference: string;
  guest_name: string;
  created_at: string;
};

type SignedItem = GuestMediaRow & { signedUrl: string | null };

type PendingUpload = {
  key: string;
  file: File;
  previewUrl: string;
};

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
}

type GuestPortalProps = {
  session: Session | null;
  authChecking: boolean;
};

function formatGiftAmount(subunit: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: currency || "GHS",
      maximumFractionDigits: 0,
    }).format(subunit / 100);
  } catch {
    return `${(subunit / 100).toFixed(0)} ${currency}`;
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function GuestPortal({ session, authChecking }: GuestPortalProps) {
  const configured = isSupabaseConfigured();
  const sb = configured ? getBrowserSupabase() : null;
  const { content } = useWeddingContent();
  const albums = content.gallery?.albums || [];

  const [loginEmail, setLoginEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState("email" as "email" | "code");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [sessionRole, setSessionRole] = useState(null as "host" | "guest" | null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [rsvp, setRsvp] = useState(null as RsvpRow);
  const [gifts, setGifts] = useState([] as GiftRow[]);
  const [items, setItems] = useState([] as SignedItem[]);
  const [rsvpErr, setRsvpErr] = useState("");
  const [giftsErr, setGiftsErr] = useState("");
  const [mediaErr, setMediaErr] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [pendingUploads, setPendingUploads] = useState([] as PendingUpload[]);
  const lastLoadedUserId = useRef("");
  const pendingRef = useRef(pendingUploads);
  pendingRef.current = pendingUploads;

  useEffect(() => {
    if (albums.length && !uploadAlbumId) {
      setUploadAlbumId(String(albums[0]?.id ?? "general"));
    }
  }, [albums, uploadAlbumId]);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    setPendingUploads(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, [uploadAlbumId]);

  const refreshRsvp = useCallback(async () => {
    if (!sb || !session) return;
    setRsvpErr("");
    const { data, error } = await sb
      .from("rsvps")
      .select("attendance,full_name,events,guests,diet,song,note,updated_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .maybeSingle();
    if (error) setRsvpErr(error.message);
    else setRsvp(data);
  }, [sb, session]);

  const refreshGifts = useCallback(async () => {
    if (!sb || !session) return;
    setGiftsErr("");
    const { data, error } = await sb
      .from("gifts")
      .select("id,amount_subunit,currency,reference,guest_name,created_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .order("created_at", { ascending: false });
    if (error) {
      setGiftsErr(error.message);
      setGifts([]);
      return;
    }
    setGifts((data || []) as GiftRow[]);
  }, [sb, session]);

  const refreshMedia = useCallback(async () => {
    if (!sb || !session?.user) return;
    setMediaErr("");
    const { data, error } = await sb
      .from("guest_media")
      .select("id,object_path,original_name,created_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setMediaErr(error.message);
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
    if (!session?.access_token) {
      setSessionRole(null);
      return;
    }
    let cancelled = false;
    setRoleLoading(true);
    void fetch("/api/auth/session", {
      headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" },
    })
      .then(r => r.json().catch(() => ({})))
      .then(j => {
        if (cancelled) return;
        const role = (j as { role?: string }).role;
        setSessionRole(role === "host" ? "host" : "guest");
      })
      .catch(() => {
        if (!cancelled) setSessionRole("guest");
      })
      .finally(() => {
        if (!cancelled) setRoleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.user?.id) {
      lastLoadedUserId.current = "";
      setRsvp(null);
      setGifts([]);
      setItems([]);
      setRsvpErr("");
      setGiftsErr("");
      setMediaErr("");
      setSessionRole(null);
      return;
    }
    if (lastLoadedUserId.current === session.user.id) return;
    lastLoadedUserId.current = session.user.id;
    void refreshRsvp();
    void refreshGifts();
    void refreshMedia();
  }, [session?.user?.id, refreshRsvp, refreshGifts, refreshMedia]);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoginMsg("");
    setLoginBusy(true);
    try {
      const result = await requestGuestOtp(loginEmail);
      if (!result.ok) {
        setLoginMsg(result.message);
        return;
      }
      setOtpStep("code");
      setOtpCode("");
      setLoginMsg(apiErrorMessage("otp_sent"));
    } finally {
      setLoginBusy(false);
    }
  };

  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoginMsg("");
    setLoginBusy(true);
    try {
      const result = await verifyGuestOtp(loginEmail, otpCode);
      if (!result.ok) {
        setLoginMsg(result.message);
        return;
      }
      setLoginMsg("");
    } finally {
      setLoginBusy(false);
    }
  };

  const onPickFiles = (e: { currentTarget: HTMLInputElement }) => {
    const files = e.currentTarget.files;
    if (!files?.length) return;
    if (!uploadAlbumId) {
      setMediaErr("Choose an album before uploading.");
      e.currentTarget.value = "";
      return;
    }
    setMediaErr("");
    const added: PendingUpload[] = [];
    const tooLarge: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        tooLarge.push(file.name);
        continue;
      }
      added.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (tooLarge.length) {
      setMediaErr(
        tooLarge.length === 1
          ? `${tooLarge[0]} is over 25MB.`
          : `${tooLarge.length} files are over 25MB each.`
      );
    }
    if (added.length) setPendingUploads(prev => [...prev, ...added]);
    e.currentTarget.value = "";
  };

  const removePending = (key: string) => {
    setPendingUploads(prev => {
      const item = prev.find(p => p.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.key !== key);
    });
  };

  const clearPending = () => {
    setPendingUploads(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const submitPendingUploads = async () => {
    if (!sb || !session?.user || !pendingUploads.length) return;
    if (!uploadAlbumId) {
      setMediaErr("Choose an album before uploading.");
      return;
    }
    setUploadBusy(true);
    setMediaErr("");
    const uid = session.user.id;
    let failed = false;
    try {
      for (const { file } of pendingUploads) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
        const path = `${uid}/${Date.now()}-${safe}`;
        const { error: upErr } = await sb.storage.from("guest-media").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) {
          setMediaErr(upErr.message);
          failed = true;
          break;
        }
        const { error: insErr } = await sb.from("guest_media").insert({
          wedding_slug: WEDDING_SLUG,
          user_id: uid,
          album_id: uploadAlbumId,
          object_path: path,
          original_name: file.name,
        });
        if (insErr) {
          setMediaErr(insErr.message);
          failed = true;
          break;
        }
      }
      if (!failed) {
        clearPending();
        await refreshMedia();
      }
    } finally {
      setUploadBusy(false);
    }
  };

  const signOut = () => {
    lastLoadedUserId.current = "";
    void sb?.auth.signOut();
  };

  if (!configured) {
    return (
      <section id="my-guest" className="section guest-portal guest-portal--off">
        <div className="section__head reveal in">
          <div>
            <div className="eyebrow">
              My guest <span className="dot" /> Sign in
            </div>
            <h2 className="section__title">Coming soon</h2>
          </div>
          <p className="section__lede">
            Guest sign-in will appear here once Supabase is configured (see{" "}
            <code className="guest-portal__code">.env.example</code>).
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="my-guest" className="section section--beige guest-portal">
      <div className="section__head reveal in">
        <div>
          <div className="eyebrow">
            My guest <span className="dot" /> Sign in
          </div>
          <h2 className="section__title">
            Your <em>activity</em>
          </h2>
        </div>
        <p className="section__lede">
          Enter your email — we&apos;ll send a 6-digit code. Guests: same email as your approved RSVP or gift. Couple:
          your allowlisted editor email.
        </p>
      </div>

      <div className="guest-portal__card reveal in">
        {authChecking ? (
          <p className="guest-portal__hint" role="status">
            Signing you in…
          </p>
        ) : !session ? (
          otpStep === "email" ? (
            <form className="guest-portal__form" onSubmit={sendOtp}>
              <div className="eyebrow">Email</div>
              <p className="guest-portal__hint">
                We&apos;ll email you a 6-digit code. Use the same address as your approved RSVP or gift.
              </p>
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
              <button type="submit" className="btn" disabled={loginBusy || !loginEmail.trim()}>
                {loginBusy ? "Sending…" : "Send 6-digit code"} <span className="arrow">→</span>
              </button>
            {loginMsg ? (
              <p className="guest-portal__msg" role="status" aria-live="polite">
                {loginMsg}
              </p>
            ) : null}
            <p className="guest-portal__fine">
              Haven&apos;t replied yet? <a href={SITE_PATHS.rsvp}>RSVP</a>
              {" · "}
              <a href={SITE_PATHS.registry}>Gifts</a>
            </p>
            </form>
          ) : (
            <form className="guest-portal__form" onSubmit={submitOtp}>
              <div className="eyebrow">6-digit code</div>
              <p className="guest-portal__hint">
                Enter the code we sent to <strong>{loginEmail}</strong>.
              </p>
              <div className="field">
                <label htmlFor="guest-login-otp">Code</label>
                <input
                  id="guest-login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={loginBusy || otpCode.length !== 6}>
                {loginBusy ? "Verifying…" : "Sign in"} <span className="arrow">→</span>
              </button>
              {loginMsg ? (
                <p className="guest-portal__msg" role="status" aria-live="polite">
                  {loginMsg}
                </p>
              ) : null}
              <p className="guest-portal__fine">
                <button
                  type="button"
                  className="guest-portal__link-btn"
                  onClick={() => {
                    setOtpStep("email");
                    setOtpCode("");
                    setLoginMsg("");
                  }}
                >
                  Use a different email
                </button>
                {" · "}
                <button
                  type="button"
                  className="guest-portal__link-btn"
                  disabled={loginBusy}
                  onClick={() => {
                    setLoginBusy(true);
                    void requestGuestOtp(loginEmail).then(result => {
                      setLoginBusy(false);
                      setLoginMsg(result.ok ? apiErrorMessage("otp_sent") : result.message);
                    });
                  }}
                >
                  Resend code
                </button>
              </p>
            </form>
          )
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

            {roleLoading ? (
              <p className="guest-portal__hint" role="status">
                Loading your account…
              </p>
            ) : null}
            {sessionRole === "host" ? <GuestHostPanel session={session} /> : null}
            <div className="guest-portal__panels">
              {sessionRole === "host" ? (
                <p className="guest-portal__hint guest-host__editor-hint">
                  Site editor: use <strong>Edit site</strong> on any page (toolbar) after signing in here.
                </p>
              ) : null}
              {rsvpErr ? (
                <p className="guest-portal__err" role="alert">
                  {rsvpErr}
                </p>
              ) : null}
              {!rsvp && !rsvpErr ? (
                <section className="guest-portal__panel">
                  <h3 className="guest-portal__panel-title">Your RSVP</h3>
                  <p className="guest-portal__hint">
                    No RSVP on file for this email. <a href={SITE_PATHS.rsvp}>Reply here</a>.
                  </p>
                </section>
              ) : null}

              <section className="guest-portal__panel" aria-labelledby="my-gifts-title">
                <h3 id="my-gifts-title" className="guest-portal__panel-title">
                  Your gifts
                </h3>
                {giftsErr ? (
                  <p className="guest-portal__err" role="alert">
                    {giftsErr}
                  </p>
                ) : null}
                {gifts.length > 0 ? (
                  <ul className="guest-portal__gift-list">
                    {gifts.map(g => (
                      <li key={g.id} className="guest-portal__gift-row">
                        <span className="guest-portal__gift-amt">
                          {formatGiftAmount(g.amount_subunit, g.currency)}
                        </span>
                        <span className="guest-portal__gift-meta">
                          {formatWhen(g.created_at)}
                          {g.guest_name ? ` · ${g.guest_name}` : ""}
                        </span>
                        <span className="guest-portal__gift-ref mono">{g.reference}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="guest-portal__hint">
                    No gifts recorded yet for this email. Paystack sends a receipt too — gifts appear here after a
                    successful contribution.
                  </p>
                )}
              </section>

              <section className="guest-portal__panel" aria-labelledby="my-photos-title">
                <h3 id="my-photos-title" className="guest-portal__panel-title">
                  Your photos
                </h3>
                {rsvp?.attendance === "no" ? (
                  <p className="guest-portal__hint">
                    Uploads are for guests who accepted the invitation. Thank you for letting us know you can&apos;t
                    attend.
                  </p>
                ) : rsvp?.attendance === "yes" ? (
                  <>
                    <div className="field guest-portal__album-field">
                      <label htmlFor="guest-upload-album">Album</label>
                      <select
                        id="guest-upload-album"
                        value={uploadAlbumId}
                        onChange={e => setUploadAlbumId(e.target.value)}
                        required
                      >
                        {albums.map((a: { id: string; title: string }) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="guest-portal__upload">
                      <label className="btn btn--gold guest-portal__file-btn">
                        Choose photos or videos
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          hidden
                          disabled={uploadBusy || !uploadAlbumId}
                          onChange={onPickFiles}
                        />
                      </label>
                      <span className="guest-portal__fine">
                        Up to 25MB per file. Review your selection, then submit. Photos appear on the public gallery.
                      </span>
                    </div>
                    {pendingUploads.length > 0 ? (
                      <div className="guest-portal__pending">
                        <p className="guest-portal__pending-label">
                          Ready to upload ({pendingUploads.length})
                        </p>
                        <ul className="guest-portal__grid guest-portal__grid--pending">
                          {pendingUploads.map(p => (
                            <li key={p.key} className="guest-portal__thumb guest-portal__thumb--pending">
                              {isVideoFile(p.file) ? (
                                <video src={p.previewUrl} className="guest-portal__media" muted playsInline />
                              ) : (
                                <img src={p.previewUrl} alt="" className="guest-portal__media" />
                              )}
                              <span className="guest-portal__cap">{p.file.name}</span>
                              <button
                                type="button"
                                className="guest-portal__remove"
                                disabled={uploadBusy}
                                onClick={() => removePending(p.key)}
                                aria-label={`Remove ${p.file.name}`}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="guest-portal__pending-actions">
                          <button
                            type="button"
                            className="btn btn--gold"
                            disabled={uploadBusy || !uploadAlbumId}
                            onClick={() => void submitPendingUploads()}
                          >
                            {uploadBusy
                              ? "Uploading…"
                              : `Submit ${pendingUploads.length} ${pendingUploads.length === 1 ? "file" : "files"}`}{" "}
                            <span className="arrow">→</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={uploadBusy}
                            onClick={clearPending}
                          >
                            Clear all
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {mediaErr ? (
                      <p className="guest-portal__err" role="alert">
                        {mediaErr}
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
                ) : (
                  <p className="guest-portal__hint">
                    <a href={SITE_PATHS.rsvp}>RSVP yes</a> to upload photos for Aaron &amp; Princess.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
