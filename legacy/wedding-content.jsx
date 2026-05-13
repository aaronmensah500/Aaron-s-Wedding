/* global React */
/**
 * Client-editable site copy + images + section visibility.
 * Persisted to localStorage. Merge on load so new keys from updates appear.
 */
const { createContext, useContext, useState, useCallback, useMemo } = React;

const WEDDING_SITE_STORAGE_KEY = "wedding-site-content-v1";

function isPlainObject(x) {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function deepMerge(a, b) {
  if (!isPlainObject(b)) return b === undefined ? a : b;
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] === undefined) continue;
    if (Array.isArray(b[k])) {
      out[k] = b[k];
    } else if (isPlainObject(b[k]) && isPlainObject(a[k])) {
      out[k] = deepMerge(a[k], b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}

function loadStoredContent() {
  try {
    const raw = localStorage.getItem(WEDDING_SITE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cloneDefaultContent() {
  return JSON.parse(JSON.stringify(WEDDING_CONTENT_DEFAULT));
}

const WEDDING_CONTENT_DEFAULT = {
  admin: {
    pin: "121226",
    requirePin: false
  },
  site: {
    weddingDateIso: "2026-12-12T16:00:00+02:00"
  },
  sections: {
    hero: true,
    story: true,
    details: true,
    rsvp: true,
    party: true,
    gallery: true,
    registry: true,
    stream: true,
    invitation: true,
    footer: true
  },
  nav: {
    monoId: "No. 12 · 12 · 26"
  },
  hero: {
    bgImageUrl: "",
    venueLine: "An evening at Villa Sereno · Lagos",
    eyebrowLeft: "Lagos · Nairobi · Paris",
    eyebrowRightBefore: "The Wedding of Aaron ",
    eyebrowRightAfter: " Adaeze",
    nameLine1: "Aaron",
    nameLine2: "Adaeze",
    savingTheDate: "Saving the date",
    dateDisplay: "XII · XII · MMXXVI",
    scrollLabel: "Scroll",
    btnInvitation: "View Invitation",
    btnRsvp: "RSVP",
    btnStory: "Our Story"
  },
  story: {
    eyebrow: "No. 01",
    eyebrowLabel: "The story",
    titleLine1: "Our ",
    titleEm: "love",
    titleLine2: "in three chapters",
    lede: "A small archive of how we got here — written by the two of us, lightly edited for the people who will read it over their morning coffee.",
    chapters: [
      {
        chapter: "Chapter I",
        title: "First glance",
        handwritten: "the meeting",
        date: "Spring, 2019 · Lisbon",
        caption: "01 · A rooftop in Lisbon",
        body: "He was reading by candlelight at a rooftop in Alfama. She walked in with her sisters, mid-laugh, wearing her grandmother's earrings. They didn't speak that night — only nodded across a long table of strangers who would later become friends.",
        flip: false,
        imageUrl: ""
      },
      {
        chapter: "Chapter II",
        title: "A summer in Lagos",
        handwritten: "the courtship",
        date: "Harmattan, 2021 · Victoria Island",
        caption: "02 · A garden after the rains",
        body: "Two years and three continents later, they spent a season at her family's house in Ikoyi. They cooked egusi on Sundays, argued about jazz, and learned each other's quietest hours. He proposed by the lagoon at low tide.",
        flip: true,
        imageUrl: ""
      },
      {
        chapter: "Chapter III",
        title: "Forever, beginning",
        handwritten: "the vow",
        date: "Twelve · Twelve · Twenty Six",
        caption: "03 · The day itself",
        body: "An evening of family, friends, and the long-standing tradition of celebrating love the way our grandmothers did — with too much food, too many speeches, and a dancefloor that refuses to close.",
        flip: false,
        imageUrl: ""
      }
    ]
  },
  details: {
    eyebrow: "No. 02",
    eyebrowLabel: "The day",
    titleLine1: "Details ",
    titleEm: "&",
    titleLine2: "directions",
    lede: "Saturday, the twelfth of December, two thousand and twenty-six. Two locations, one continuous evening. A car service runs between venues every fifteen minutes.",
    ceremonyCard: {
      imageUrl: "",
      imageLabel: "Garden Pavilion · Ceremony",
      eyebrow: "The Ceremony",
      title: "Villa Sereno, Garden Pavilion",
      addrLine1: "14, Banana Island Boulevard",
      addrLine2: "Ikoyi, Lagos · Nigeria",
      arrivalLabel: "Arrival",
      arrivalTime: "3:30 PM",
      vowsLabel: "Vows",
      vowsTime: "4:30 PM",
      attireLabel: "Attire",
      attireValue: "Formal"
    },
    receptionCard: {
      imageUrl: "",
      imageLabel: "The Atrium · Reception",
      eyebrow: "The Reception",
      title: "The Atrium at Sereno",
      addrLine1: "14, Banana Island Boulevard",
      addrLine2: "Ikoyi, Lagos · Nigeria",
      dinnerLabel: "Dinner",
      dinnerTime: "7:30 PM",
      dancingLabel: "Dancing",
      dancingTime: "10:00 PM",
      attireLabel: "Attire",
      attireValue: "Black tie"
    },
    mapPinCeremony: "Ceremony · 4:30 PM",
    mapPinReception: "Reception · 7:30 PM",
    itineraryEyebrow: "The evening",
    itineraryTitle: "Itinerary",
    addCalendarLabel: "Add to calendar",
    itinerary: [
      { time: "3:30 PM", title: "Welcome arrival", sub: "Champagne reception on the South Lawn", loc: "Villa Sereno", attire: "Smart casual" },
      { time: "4:30 PM", title: "Ceremony", sub: "Vows under the canopy of palms", loc: "Garden Pavilion", attire: "Formal" },
      { time: "6:00 PM", title: "Cocktail hour", sub: "Live string quartet · Hors d'oeuvres", loc: "West Terrace", attire: "Formal" },
      { time: "7:30 PM", title: "Dinner & speeches", sub: "Six-course tasting menu", loc: "The Atrium", attire: "Black tie" },
      { time: "10:00 PM", title: "Dancing", sub: "DJ set until late", loc: "The Pavilion", attire: "Bring shoes" }
    ]
  },
  rsvp: {
    eyebrow: "No. 03",
    eyebrowLabel: "Reply",
    titleLine1: "Kindly ",
    titleEm: "reply",
    titleLine2: "by October 1st",
    lede: "A few questions so we can host you properly. Three short steps — and a quiet seat at the table is yours.",
    posterStampTop: "An Invitation",
    posterTitleHtml: "The pleasure<br/> of your <em>company</em>",
    posterBody: "You are warmly invited to share an evening at Villa Sereno. We've reserved a seat in your name and would love to know how you take your wine.",
    posterStampBottom: 'Aaron <span style="font-family:var(--script);font-size:18px;color:var(--champagne)">&amp;</span> Adaeze · MMXXVI',
    step1Eyebrow: "Step one",
    step1Lead: "Let's begin with your name.",
    labelName: "Full name",
    phName: "As it appears on the invitation",
    labelEmail: "Email",
    phEmail: "To send your travel notes",
    step2Eyebrow: "Step two",
    step2Lead: "Will you be joining us?",
    acceptLabel: "Joyfully accepts",
    declineLabel: "Regretfully declines",
    eventsLabel: "Which events",
    guestsLabel: "Guests in your party",
    guestsMaxNote: "Max 6",
    step3Eyebrow: "Step three",
    step3Lead: "How we'll take care of you.",
    dietLabel: "Dietary preferences",
    songLabel: "A song that will get you on the floor",
    songPh: "Artist — Song",
    noteLabel: "A note to Aaron & Adaeze",
    notePh: "Optional — anything at all",
    successEyebrow: "Received with love",
    successYesTitle: "We'll see you there.",
    successNoTitle: "We'll miss you, deeply.",
    successNoBody: "Thank you for letting us know. We'll send you photographs after the day, with love.",
    anotherGuest: "Reply for another guest",
    backLabel: "Back",
    continueLabel: "Continue",
    sendLabel: "Send reply",
    confirmVenue: "Villa Sereno"
  },
  party: {
    eyebrow: "No. 04",
    eyebrowLabel: "The party",
    titleLine1: "The people",
    titleLine2: "who got us ",
    titleEm: "here",
    lede: "Family, the friends who became family, and two children who will steal the show.",
    members: [
      { role: "Maid of Honor", name: "Chiamaka Eze", bio: "Sister, confidante, keeper of every secret since 2003.", imageUrl: "" },
      { role: "Best Man", name: "Daniel Okafor", bio: "Best friend since university. Will deliver the speech with both tears and timing.", imageUrl: "" },
      { role: "Bridesmaid", name: "Amara Nwosu", bio: "Cousin and unofficial wedding planner. Pinterest board curator.", imageUrl: "" },
      { role: "Groomsman", name: "Tobi Adesanya", bio: "Childhood friend. Also taking the photos on his beloved film camera.", imageUrl: "" },
      { role: "Bridesmaid", name: "Lola Ibikunle", bio: "Architect. Designed the chuppah you'll stand under.", imageUrl: "" },
      { role: "Groomsman", name: "Marcus Kane", bio: "Roommate, climbing partner, brother in everything but blood.", imageUrl: "" },
      { role: "Flower Girl", name: "Aria, age 5", bio: "Carries the rings with a seriousness usually reserved for diplomats.", imageUrl: "" },
      { role: "Ring Bearer", name: "Eli, age 7", bio: "Will high-five everyone in the front row. We've decided to allow this.", imageUrl: "" }
    ]
  },
  gallery: {
    eyebrow: "No. 05",
    eyebrowLabel: "The album",
    titleLine1: "A small ",
    titleEm: "archive",
    lede: "Photographs from the years that led here, and the engagement shoot by film. Click any frame to view full size — arrow keys to wander through the rest.",
    items: [
      { ratio: "3/4", caption: "Engagement · Lagos", imageUrl: "" },
      { ratio: "4/5", caption: "The proposal", imageUrl: "" },
      { ratio: "1/1", caption: "Family · Nairobi", imageUrl: "" },
      { ratio: "4/3", caption: "First trip · Lisbon", imageUrl: "" },
      { ratio: "3/4", caption: "Sunday at home", imageUrl: "" },
      { ratio: "1/1", caption: "Grandmother's earrings", imageUrl: "" },
      { ratio: "4/5", caption: "Bridal portrait", imageUrl: "" },
      { ratio: "3/4", caption: "On the lagoon", imageUrl: "" },
      { ratio: "4/3", caption: "After the rains", imageUrl: "" }
    ]
  },
  registry: {
    eyebrow: "No. 06",
    eyebrowLabel: "Gifts",
    titleLine1: "A quiet ",
    titleEm: "contribution",
    lede: "Your presence is the gift. For those who have insisted — a contribution toward our honeymoon in Zanzibar, or one of three causes close to us.",
    fundEyebrow: "Honeymoon fund",
    fundTitle: "An island in Zanzibar",
    currencies: "NGN · USD · GBP",
    fundBody: "Two weeks on the east coast, a small fishing boat, and the slowest pace we can manage. Choose an amount that feels right.",
    qrEyebrow: "Scan to give",
    qrTitle: "Apple Pay · Bank · Crypto",
    qrDomain: "aaron-adaeze.gift",
    qrHint: "Open in any app"
  },
  stream: {
    eyebrow: "No. 07",
    eyebrowLabel: "Live",
    titleLine1: "Watch ",
    titleEm: "from",
    titleLine2: "anywhere",
    lede: "For the friends and family who cannot be there in person. The ceremony will stream live in 4K from three angles, with a private link sent to your inbox the morning of.",
    playerImageUrl: "",
    playerImageLabel: "Live · Garden Pavilion · Camera A",
    liveBadge: "Live in 12·12·26",
    controlsLeft: "4K · HDR",
    awaitingText: "Awaiting broadcast",
    previewText: "Preview · 00:24",
    panelEyebrow: "Set a reminder",
    panelTitle: "The broadcast begins Saturday at 4:30 PM WAT",
    remindLabel: "Remind me",
    calendarLabel: "Add to calendar",
    schedule: [
      { label: "Pre-show", time: "4:00 PM" },
      { label: "Ceremony", time: "4:30 PM" },
      { label: "Cocktail hour", time: "6:00 PM" },
      { label: "Dinner & speeches", time: "7:30 PM" },
      { label: "First dance", time: "9:15 PM" }
    ]
  },
  invitation: {
    eyebrow: "No. 08",
    eyebrowLabel: "Guest experience",
    titleLine1: "A small ",
    titleEm: "concierge",
    titleLine2: "just for you",
    ledeTemplate: "{{name}}, this corner of the page is yours. Your invitation, your seat, and a few details we've put together for the weekend.",
    guestFirstName: "Eleanor",
    guestLastName: "Adekunle",
    card1Title: "QR Invitation",
    card1Body: "Show this at the gate. It pairs with your name, table, and dietary notes.",
    card1PreviewPrefix: "QR · ",
    card2Title: "Seating",
    card2Body: "Table 07 · with the cousins from Nairobi. Window seat reserved.",
    card3Title: "Wallet Pass",
    card3Body: "Add the invitation to Apple Wallet or Google Pay. Live updates if anything changes.",
    walletTopLeft: "Invitation",
    walletTopRight: "12·12·26",
    walletGuestEyebrow: "Guest",
    walletTable: "07",
    walletSeat: "3",
    walletWine: "Red",
    card4Title: "A welcome note",
    welcomeQuoteTemplate: "\"{{name}}, we cannot wait to see you. Save us a dance — A & A\"",
    card4Footer: "Personal · From the couple"
  },
  footer: {
    eyebrow: "With love, from",
    signatureLine1: "Aaron",
    signatureLine2: "Adaeze",
    hash: "#AaronTakesAdaeze · MMXXVI",
    copyrightLine: "© Aaron & Adaeze · Twelve · Twelve · Twenty Six",
    creditLine: "Designed with care\nin Lagos & Paris",
    social: [
      { label: "Instagram", href: "#" },
      { label: "Spotify", href: "#" },
      { label: "Photos", href: "#" },
      { label: "Contact", href: "#" }
    ]
  }
};

const WeddingContentContext = createContext(null);

function WeddingContentProvider({ children }) {
  const [content, setContent] = useState(() => deepMerge(cloneDefaultContent(), loadStoredContent() || {}));
  const [revision, setRevision] = useState(0);

  const patchContent = useCallback(arg => {
    setContent(prev => {
      const partial = typeof arg === "function" ? arg(prev) : arg;
      const next = deepMerge(prev, partial);
      try {
        localStorage.setItem(WEDDING_SITE_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Could not save wedding content", e);
      }
      return next;
    });
    setRevision(r => r + 1);
  }, []);

  const replaceContent = useCallback(nextFull => {
    const next = deepMerge(cloneDefaultContent(), nextFull && typeof nextFull === "object" ? nextFull : {});
    setContent(next);
    try {
      localStorage.setItem(WEDDING_SITE_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Could not save wedding content", e);
    }
    setRevision(r => r + 1);
  }, []);

  const resetToDefaults = useCallback(() => {
    const next = cloneDefaultContent();
    setContent(next);
    try {
      localStorage.removeItem(WEDDING_SITE_STORAGE_KEY);
    } catch (e) { /* ignore */ }
    setRevision(r => r + 1);
  }, []);

  const value = useMemo(
    () => ({ content, patchContent, replaceContent, resetToDefaults, revision }),
    [content, patchContent, replaceContent, resetToDefaults, revision]
  );

  return <WeddingContentContext.Provider value={value}>{children}</WeddingContentContext.Provider>;
}

function useWeddingContent() {
  const ctx = useContext(WeddingContentContext);
  if (!ctx) throw new Error("useWeddingContent must be used inside WeddingContentProvider");
  return ctx;
}

Object.assign(window, {
  WEDDING_SITE_STORAGE_KEY,
  WEDDING_CONTENT_DEFAULT,
  WeddingContentProvider,
  useWeddingContent,
  deepMergeWeddingContent: deepMerge
});
