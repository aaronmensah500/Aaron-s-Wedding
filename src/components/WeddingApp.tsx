import { useEffect, useMemo } from "react";
import { WeddingContentProvider, useWeddingContent } from "../lib/weddingContent";
import { ClientAdmin } from "./AdminPanel";
import {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRadio,
  TweakSelect,
} from "./TweaksPanel";
import { useReveal, Nav, Hero, LoveStory, Details } from "./wedding/Core";
import { TravelLogistics } from "./wedding/TravelLogistics";
import { RSVP, BridalParty, Gallery } from "./wedding/RsvpBlock";
import { Registry, Livestream, GuestExperience, Footer } from "./wedding/ExtrasBlock";
import GuestPortal from "./GuestPortal";

/** Floating editor + tweaks: on in dev, or when explicitly enabled for this deploy (never set on the public URL). */
const showSiteEditor =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_SITE_EDITOR === "true";

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

function App() {
  const [tweaksRaw, setTweak] = useTweaks({ ...TWEAK_DEFAULTS });
  const tweaks = tweaksRaw as TweakState;
  const { content, revision } = useWeddingContent();
  const countdownTarget = useMemo(() => {
    const d = new Date(content.site?.weddingDateIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [content.site?.weddingDateIso]);

  useReveal(revision);

  useEffect(() => {
    applyTweaks(tweaks);
  }, [tweaks]);

  const sec = content.sections || {};

  return (
    <div className="app">
      <Nav />
      {sec.hero !== false && <Hero countdownTarget={countdownTarget} />}
      {sec.story !== false && <LoveStory />}
      {sec.details !== false && <Details />}
      {sec.travel !== false && <TravelLogistics />}
      {sec.rsvp !== false && <RSVP initialStep={tweaks.rsvpStep} />}
      {sec.party !== false && <BridalParty />}
      {sec.gallery !== false && <Gallery />}
      {sec.registry !== false && <Registry />}
      {sec.stream !== false && <Livestream />}
      {sec.invitation !== false && <GuestExperience />}
      {sec.footer !== false && <Footer />}

      <GuestPortal />

      {showSiteEditor ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

export default function WeddingApp() {
  return (
    <WeddingContentProvider>
      <App />
    </WeddingContentProvider>
  );
}
