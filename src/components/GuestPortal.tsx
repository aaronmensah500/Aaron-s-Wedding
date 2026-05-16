import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "../lib/supabase/browser";
import { parseApiErrorCode } from "../lib/api/json";
import { WEDDING_SLUG } from "../lib/guest-access";
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

export default function GuestPortal() {
  const configured = isSupabaseConfigured();
  const sb = configured ? getBrowserSupabase() : null;

  const [session, setSession] = useState(null as Session | null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [rsvp, setRsvp] = useState(null as RsvpRow);
  const [gifts, setGifts] = useState([] as GiftRow[]);
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
      .select("attendance,full_name,events,guests,diet,song,note,updated_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .maybeSingle();
    if (error) setLoadErr(error.message);
    else setRsvp(data);
  }, [sb, session]);

  const refreshGifts = useCallback(async () => {
    if (!sb || !session) return;
    const { data, error } = await sb
      .from("gifts")
      .select("id,amount_subunit,currency,reference,guest_name,created_at")
      .eq("wedding_slug", WEDDING_SLUG)
      .order("created_at", { ascending: false });
    if (error) {
      setLoadErr(error.message);
      setGifts([]);
      return;
    }
    setGifts((data || []) as GiftRow[]);
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
      setGifts([]);
      setItems([]);
      return;
    }
    void refreshRsvp();
    void refreshGifts();
    void refreshMedia();
  }, [session, refreshRsvp, refreshGifts, refreshMedia]);

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
            ? "We don't have an RSVP or gift from that email yet. RSVP or contribute first, then try again."
            : typeof j.error === "object" && j.error !== null && "message" in j.error
              ? String((j.error as { message: unknown }).message)
              : code || "Could not send link."
        );
        return;
      }
      setLoginMsg("Check your email for the sign-in link — it opens this page.");
    } finally {
      setLoginBusy(false);
    }
  };

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
      <section id="my-guest" className="section guest-portal guest-portal--off">
        <div className="section__head reveal">
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
      <div className="section__head reveal">
        <div>
          <div className="eyebrow">
            My guest <span className="dot" /> Sign in
          </div>
          <h2 className="section__title">
            Your <em>activity</em>
          </h2>
        </div>
        <p className="section__lede">
          See your RSVP, gifts, and — if you&apos;re attending — share photos. Use the same email you used when you replied or contributed.
        </p>
      </div>

      <div className="guest-portal__card reveal">
        {!session ? (
          <form className="guest-portal__form" onSubmit={requestLink}>
            <div className="eyebrow">Email sign-in</div>
            <p className="guest-portal__hint">
              No password — we&apos;ll send a one-time link. Works after you&apos;ve RSVP&apos;d or made a gift with this email.
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
            <button type="submit" className="btn" disabled={loginBusy}>
              {loginBusy ? "Sending…" : "Email me a sign-in link"} <span className="arrow">→</span>
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

            {loadErr ? (
              <p className="guest-portal__err" role="alert">
                {loadErr}
              </p>
            ) : null}

            <div className="guest-portal__panels">
              {rsvp ? (
                <section className="guest-portal__panel" aria-labelledby="my-rsvp-title">
                  <h3 id="my-rsvp-title" className="guest-portal__panel-title">
                    Your RSVP
                  </h3>
                  <dl className="guest-portal__dl">
                    <div>
                      <dt>Reply</dt>
                      <dd>{rsvp.attendance === "yes" ? "Joyfully attending" : "Regretfully cannot attend"}</dd>
                    </div>
                    {rsvp.attendance === "yes" ? (
                      <>
                        <div>
                          <dt>Events</dt>
                          <dd>{rsvp.events?.length ? rsvp.events.join(", ") : "—"}</dd>
                        </div>
                        <div>
                          <dt>Guests</dt>
                          <dd>{rsvp.guests}</dd>
                        </div>
                        <div>
                          <dt>Dietary</dt>
                          <dd>{rsvp.diet?.length ? rsvp.diet.join(", ") : "None noted"}</dd>
                        </div>
                        {rsvp.song ? (
                          <div>
                            <dt>Song request</dt>
                            <dd>{rsvp.song}</dd>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {rsvp.note ? (
                      <div>
                        <dt>Note</dt>
                        <dd>{rsvp.note}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Last updated</dt>
                      <dd>{formatWhen(rsvp.updated_at)}</dd>
                    </div>
                  </dl>
                  <p className="guest-portal__fine">
                    Need to change something? <a href={SITE_PATHS.rsvp}>Submit RSVP again</a> with the same email.
                  </p>
                </section>
              ) : (
                <section className="guest-portal__panel">
                  <h3 className="guest-portal__panel-title">Your RSVP</h3>
                  <p className="guest-portal__hint">
                    No RSVP on file for this email. <a href={SITE_PATHS.rsvp}>Reply here</a>.
                  </p>
                </section>
              )}

              <section className="guest-portal__panel" aria-labelledby="my-gifts-title">
                <h3 id="my-gifts-title" className="guest-portal__panel-title">
                  Your gifts
                </h3>
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
                    No gifts recorded yet for this email. Paystack sends a receipt too — gifts appear here after a successful contribution.
                  </p>
                )}
              </section>

              <section className="guest-portal__panel" aria-labelledby="my-photos-title">
                <h3 id="my-photos-title" className="guest-portal__panel-title">
                  Your photos
                </h3>
                {rsvp?.attendance === "no" ? (
                  <p className="guest-portal__hint">
                    Uploads are for guests who accepted the invitation. Thank you for letting us know you can&apos;t attend.
                  </p>
                ) : rsvp?.attendance === "yes" ? (
                  <>
                    <div className="guest-portal__upload">
                      <label className="btn btn--gold guest-portal__file-btn">
                        {uploadBusy ? "Uploading…" : "Choose photos or videos"}
                        <input type="file" accept="image/*,video/*" multiple hidden disabled={uploadBusy} onChange={onPickFiles} />
                      </label>
                      <span className="guest-portal__fine">Up to 25MB per file.</span>
                    </div>
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
