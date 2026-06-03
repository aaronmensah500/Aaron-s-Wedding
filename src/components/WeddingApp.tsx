import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { WeddingContentProvider, useWeddingContent } from "../lib/weddingContent";
import { SiteEditorProvider, useSiteEditorOptional } from "../lib/siteEditor";
import type { SitePageId } from "../lib/sitePages";
import {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRadio,
  TweakSelect,
} from "./TweaksPanel";
import { useReveal, Nav, Hero, LoveStory, Details } from "./wedding/Core";
import { HomeContact } from "./wedding/HomeContact";
import { HomeHub } from "./wedding/HomeHub";
import { HomeStoryTeaser } from "./wedding/HomeStoryTeaser";
import { TravelLogistics } from "./wedding/TravelLogistics";
import { RSVP, BridalParty, Gallery } from "./wedding/RsvpBlock";
import { Registry, Livestream, Footer } from "./wedding/ExtrasBlock";

const ClientAdmin = lazy(() => import("./AdminPanel").then((m) => ({ default: m.ClientAdmin })));
const GuestPage = lazy(() => import("./GuestPage"));

function readAdminQuery(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("admin") === "1";
  } catch {
    return false;
  }
}

const TWEAK_DEFAULTS = {
  palette: "ivory",
  serif: "cormorant",
  rsvpStep: 0,
} as const;

type TweakState = {
  palette: string;
  serif: string;
  rsvpStep: number;
};

const PALETTES: Record<string, Record<string, string>> = {
  ivory: {
    "--bg": "#EFE2C9",
    "--fg": "#2A0A0E",
    "--warm-white": "#F6ECD8",
    "--champagne": "#D9B26B",
    "--burgundy": "#6B0F18",
    "--blush": "#E8CFAE",
    "--beige": "#D9C29A",
    "--beige-2": "#B89E72",
    "--soft-black": "#2A0A0E",
    "--charcoal": "#3D1217",
    "--ivory": "#EFE2C9",
  },
  burgundy: {
    "--bg": "#2A0A0E",
    "--fg": "#EFE2C9",
    "--warm-white": "#3D1217",
    "--champagne": "#D9B26B",
    "--burgundy": "#8C1620",
    "--blush": "#6B0F18",
    "--beige": "#4A0A11",
    "--beige-2": "#6B0F18",
    "--soft-black": "#EFE2C9",
    "--charcoal": "#3D1217",
    "--ivory": "#2A0A0E",
  },
  champagne: {
    "--bg": "#F6ECD8",
    "--fg": "#2A0A0E",
    "--warm-white": "#FBF4E4",
    "--champagne": "#B8964B",
    "--burgundy": "#6B0F18",
    "--blush": "#E8CFAE",
    "--beige": "#DCC5A0",
    "--beige-2": "#B89E72",
    "--soft-black": "#2A0A0E",
    "--charcoal": "#3D1217",
    "--ivory": "#F6ECD8",
  },
};

const SERIFS: Record<string, string> = {
  cormorant: '"Cormorant Garamond", "Cormorant", "EB Garamond", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  ibarra: '"Ibarra Real Nova", Georgia, serif',
};

function applyTweaks(t: TweakState) {
  const r = document.documentElement;
  const p = PALETTES[t.palette] || PALETTES.ivory;
  for (const [k, v] of Object.entries(p)) r.style.setProperty(k, v);
  const dark = t.palette === "burgundy";
  r.style.setProperty("--muted", dark ? "rgba(239,226,201,0.65)" : "rgba(42,10,14,0.6)");
  r.style.setProperty("--hairline", dark ? "rgba(239,226,201,0.16)" : "rgba(42,10,14,0.14)");
  r.style.setProperty("--hairline-gold", "rgba(217,178,107,0.45)");
  r.style.setProperty("--serif", SERIFS[t.serif] || SERIFS.cormorant);
}

type AppProps = { page: SitePageId };

function App({ page }: AppProps) {
  const [adminUrlUnlock, setAdminUrlUnlock] = useState(readAdminQuery);
  const [tweaksRaw, setTweak] = useTweaks({ ...TWEAK_DEFAULTS });
  const tweaks = tweaksRaw as TweakState;
  const { content, revision } = useWeddingContent();
  const editor = useSiteEditorOptional();
  const countdownTarget = useMemo(() => {
    const d = new Date(content.site?.weddingDateIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [content.site?.weddingDateIso]);

  useEffect(() => {
    const sync = () => setAdminUrlUnlock(readAdminQuery());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useReveal(revision, page);

  useEffect(() => {
    applyTweaks(tweaks);
  }, [tweaks]);

  const sec = content.sections || {};
  const showFooter = sec.footer !== false;

  /** Dev, env flag, ?admin=1, or host signed in on /guest with allowlisted email. */
  const showSiteEditor =
    import.meta.env.DEV ||
    import.meta.env.PUBLIC_SHOW_SITE_EDITOR === "true" ||
    adminUrlUnlock ||
    Boolean(editor?.emailAuthEnabled && editor?.hasSession);

  return (
    <div className="app" data-page={page}>
      <Nav currentPage={page} />
      {page === "home" && sec.hero !== false && <Hero countdownTarget={countdownTarget} />}
      {page === "home" && sec.story !== false && <HomeStoryTeaser />}
      {page === "home" && <HomeContact />}
      {page === "home" && sec.registry !== false && <Registry compact />}
      {page === "home" && <HomeHub />}
      {page === "story" && sec.story !== false && <LoveStory />}
      {page === "wedding" && sec.details !== false && <Details />}
      {page === "wedding" && sec.party !== false && <BridalParty />}
      {page === "travel" && sec.travel !== false && <TravelLogistics />}
      {page === "rsvp" && sec.rsvp !== false && <RSVP initialStep={tweaks.rsvpStep} />}
      {page === "gallery" && sec.gallery !== false && <Gallery />}
      {page === "registry" && sec.registry !== false && <Registry />}
      {page === "registry" && sec.stream !== false && <Livestream />}
      {page === "guest" && (sec.invitation !== false || import.meta.env.PUBLIC_SUPABASE_URL) ? (
        <Suspense
          fallback={
            <section id="my-guest" className="section section--beige guest-portal">
              <p className="guest-portal__hint" style={{ opacity: 1 }}>
                Loading My guest…
              </p>
            </section>
          }
        >
          <GuestPage revision={revision} />
        </Suspense>
      ) : null}
      {showFooter && <Footer key={revision} />}

      {showSiteEditor ? (
        <Suspense>
          <ClientAdmin />
          <TweaksPanel title="Tweaks">
            <TweakSection label="Palette" />
            <TweakRadio
              label="Mood"
              value={tweaks.palette}
              onChange={(v: string) => setTweak("palette", v)}
              options={["ivory", "burgundy", "champagne"]}
            />
            <TweakSection label="Typography" />
            <TweakRadio
              label="Display serif"
              value={tweaks.serif}
              onChange={(v: string) => setTweak("serif", v)}
              options={["cormorant", "playfair", "ibarra"]}
            />
            <TweakSection label="RSVP" />
            <TweakSelect
              label="Open at step"
              value={String(tweaks.rsvpStep)}
              onChange={(v: string) => setTweak("rsvpStep", Number(v))}
              options={["0", "1", "2", "3"]}
            />
          </TweaksPanel>
        </Suspense>
      ) : null}
    </div>
  );
}

type WeddingAppProps = { page?: SitePageId };

function AppWithSiteEditor({ page }: AppProps) {
  const { content } = useWeddingContent();
  return (
    <SiteEditorProvider
      currentPage={page}
      requirePin={content.admin?.requirePin !== false}
      expectedPin={String(content.admin?.pin ?? "")}
    >
      <App page={page} />
    </SiteEditorProvider>
  );
}

export default function WeddingApp({ page = "home" }: WeddingAppProps) {
  return (
    <WeddingContentProvider>
      <AppWithSiteEditor page={page} />
    </WeddingContentProvider>
  );
}
