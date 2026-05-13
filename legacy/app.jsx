/* global React, ReactDOM, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, useTweaks */
const { useEffect: useEffectMain, useMemo } = React;
const { WeddingContentProvider, useWeddingContent, ClientAdmin } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "ivory",
  "serif": "cormorant",
  "rsvpStep": 0
}/*EDITMODE-END*/;

const PALETTES = {
  ivory:    { "--bg": "#EFE2C9", "--fg": "#2A0A0E", "--warm-white": "#F6ECD8", "--champagne": "#D9B26B", "--burgundy": "#6B0F18", "--blush": "#E8CFAE", "--beige": "#D9C29A", "--beige-2": "#B89E72", "--soft-black": "#2A0A0E", "--charcoal": "#3D1217", "--ivory": "#EFE2C9" },
  burgundy: { "--bg": "#2A0A0E", "--fg": "#EFE2C9", "--warm-white": "#3D1217", "--champagne": "#D9B26B", "--burgundy": "#8C1620", "--blush": "#6B0F18", "--beige": "#4A0A11", "--beige-2": "#6B0F18", "--soft-black": "#EFE2C9", "--charcoal": "#3D1217", "--ivory": "#2A0A0E" },
  champagne:{ "--bg": "#F6ECD8", "--fg": "#2A0A0E", "--warm-white": "#FBF4E4", "--champagne": "#B8964B", "--burgundy": "#6B0F18", "--blush": "#E8CFAE", "--beige": "#DCC5A0", "--beige-2": "#B89E72", "--soft-black": "#2A0A0E", "--charcoal": "#3D1217", "--ivory": "#F6ECD8" }
};

const SERIFS = {
  cormorant: '"Cormorant Garamond", "Cormorant", "EB Garamond", Georgia, serif',
  playfair:  '"Playfair Display", Georgia, serif',
  ibarra:    '"Ibarra Real Nova", Georgia, serif'
};

function applyTweaks(t) {
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
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { content, revision } = useWeddingContent();
  const countdownTarget = useMemo(() => {
    const d = new Date(content.site?.weddingDateIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [content.site?.weddingDateIso]);

  window.WL.useReveal(revision);

  useEffectMain(() => { applyTweaks(tweaks); }, [tweaks]);

  const { Nav, Hero, LoveStory, Details, RSVP, BridalParty, Gallery, Registry, Livestream, GuestExperience, Footer } = window.WL;
  const sec = content.sections || {};

  return (
    <div className="app">
      <Nav />
      {sec.hero !== false && <Hero countdownTarget={countdownTarget} />}
      {sec.story !== false && <LoveStory />}
      {sec.details !== false && <Details />}
      {sec.rsvp !== false && <RSVP initialStep={tweaks.rsvpStep} />}
      {sec.party !== false && <BridalParty />}
      {sec.gallery !== false && <Gallery />}
      {sec.registry !== false && <Registry />}
      {sec.stream !== false && <Livestream />}
      {sec.invitation !== false && <GuestExperience />}
      {sec.footer !== false && <Footer />}

      <ClientAdmin />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette" />
        <TweakRadio
          label="Mood"
          value={tweaks.palette}
          onChange={v => setTweak("palette", v)}
          options={["ivory", "burgundy", "champagne"]}
        />
        <TweakSection label="Typography" />
        <TweakRadio
          label="Display serif"
          value={tweaks.serif}
          onChange={v => setTweak("serif", v)}
          options={["cormorant", "playfair", "ibarra"]}
        />
        <TweakSection label="RSVP" />
        <TweakSelect
          label="Open at step"
          value={String(tweaks.rsvpStep)}
          onChange={v => setTweak("rsvpStep", Number(v))}
          options={["0", "1", "2", "3"]}
        />
      </TweaksPanel>
    </div>
  );
}

function AppRoot() {
  return (
    <WeddingContentProvider>
      <App />
    </WeddingContentProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppRoot />);
