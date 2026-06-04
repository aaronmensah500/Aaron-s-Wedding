/**
 * Client-editable site copy + images + section visibility.
 * Persisted to localStorage. Merge on load so new keys from updates appear.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { getAdminAuthHeader } from "./adminAuthClient";
import { fetchPublishedSiteContent, publishSiteContent } from "./siteContentApi";
import { contentPatchesFromWeddingDate } from "./weddingDateFormats";
import { stripToPlainText } from "./plainText";

/** Current persisted key. v1 is read once and migrated so repo default name/venue updates are not stuck under old merges. */
const WEDDING_SITE_STORAGE_KEY = "wedding-site-content-v2";
const WEDDING_SITE_STORAGE_KEY_LEGACY_V1 = "wedding-site-content-v1";
/** When the editor last changed copy in this browser (ISO). Compared to Supabase `updated_at` on load. */
const WEDDING_SITE_LOCAL_EDITED_AT_KEY = "wedding-site-content-local-edited-at";

function parseContentTimestamp(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Prefer published copy on load unless this browser has newer unpublished edits. */
export function shouldApplyPublishedSiteContent(
  localEditedAt: string | null | undefined,
  publishedUpdatedAt: string | null | undefined
): boolean {
  const publishedAt = parseContentTimestamp(publishedUpdatedAt);
  if (!publishedAt) return true;
  const localAt = parseContentTimestamp(localEditedAt);
  if (!localAt) return true;
  return publishedAt >= localAt;
}

/** True when saved browser copy disagrees with published (e.g. date changed before publish). */
export function localDraftDiffersFromPublished(
  local: WeddingSiteContent,
  published: WeddingSiteContent
): boolean {
  const localIso = local.site?.weddingDateIso ?? "";
  const publishedIso = published.site?.weddingDateIso ?? "";
  if (localIso && publishedIso && localIso !== publishedIso) return true;
  const derived = contentPatchesFromWeddingDate(localIso);
  if (derived && local.hero?.dateDisplay && local.hero.dateDisplay !== derived.hero.dateDisplay) {
    return true;
  }
  return false;
}

function readLocalEditedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(WEDDING_SITE_LOCAL_EDITED_AT_KEY);
    return v?.trim() ? v : null;
  } catch {
    return null;
  }
}

function markLocalContentEdited(at = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WEDDING_SITE_LOCAL_EDITED_AT_KEY, at);
  } catch {
    /* ignore */
  }
}

function clearLocalEditedAt() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WEDDING_SITE_LOCAL_EDITED_AT_KEY);
  } catch {
    /* ignore */
  }
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function deepMerge(a: unknown, b: unknown): unknown {
  if (!isPlainObject(b)) return b === undefined ? a : b;
  if (!isPlainObject(a) && !Array.isArray(a)) return b;
  const out = Array.isArray(a) ? [...a] : { ...(a as Record<string, unknown>) };
  for (const k of Object.keys(b)) {
    if (b[k] === undefined) continue;
    if (Array.isArray(b[k])) {
      (out as Record<string, unknown>)[k] = b[k];
    } else if (isPlainObject(b[k]) && isPlainObject((a as Record<string, unknown>)[k])) {
      (out as Record<string, unknown>)[k] = deepMerge((a as Record<string, unknown>)[k], b[k]);
    } else {
      (out as Record<string, unknown>)[k] = b[k];
    }
  }
  return out;
}

function readStoredSite(): { raw: unknown | null; migratedFromV1: boolean } {
  if (typeof window === "undefined") return { raw: null, migratedFromV1: false };
  try {
    const v2 = localStorage.getItem(WEDDING_SITE_STORAGE_KEY);
    if (v2) return { raw: JSON.parse(v2), migratedFromV1: false };
    const v1 = localStorage.getItem(WEDDING_SITE_STORAGE_KEY_LEGACY_V1);
    if (!v1) return { raw: null, migratedFromV1: false };
    const parsed = JSON.parse(v1);
    try {
      localStorage.removeItem(WEDDING_SITE_STORAGE_KEY_LEGACY_V1);
    } catch {
      /* ignore */
    }
    return { raw: parsed, migratedFromV1: true };
  } catch {
    return { raw: null, migratedFromV1: false };
  }
}

function cloneDefaultContent(): typeof WEDDING_CONTENT_DEFAULT {
  return JSON.parse(JSON.stringify(WEDDING_CONTENT_DEFAULT)) as typeof WEDDING_CONTENT_DEFAULT;
}

const WEDDING_CONTENT_DEFAULT = {
  admin: {
    pin: "121226",
    requirePin: false
  },
  site: {
    weddingDateIso: "2026-12-12T16:30:00+00:00"
  },
  sections: {
    hero: true,
    story: true,
    details: true,
    travel: true,
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
  homeHub: {
    eyebrow: "Explore",
    titleLine1: "Everything for ",
    titleEm: "the weekend",
    titleLine2: "",
    lede: "",
    moreEyebrow: "More",
    moreTitle: "Plan the weekend",
    cards: [
      {
        id: "wedding",
        eyebrow: "Ceremony & reception",
        title: "The wedding",
        lede: "Venues in Accra, timings, dress code, and the evening itinerary."
      },
      {
        id: "travel",
        eyebrow: "Plan your trip",
        title: "Travel",
        lede: "Flights, where to stay, and getting around Ghana."
      },
      {
        id: "gallery",
        eyebrow: "Memories",
        title: "Gallery",
        lede: "A few favourite moments — more to come after the day."
      },
      {
        id: "guest",
        eyebrow: "Just for you",
        title: "Your invitation",
        lede: "Personal QR, seating, and guest photo upload."
      }
    ]
  },
  hero: {
    bgImageUrl: "",
    venueLine: "Agape House · El-Wak Stadium · Accra",
    eyebrowLeft: "Accra · Nairobi · Paris",
    eyebrowRightBefore: "The Wedding of Aaron ",
    eyebrowRightAfter: " Princess",
    nameLine1: "Aaron",
    nameLine2: "Princess",
    savingTheDate: "Saving the date",
    dateDisplay: "XII · XII · MMXXVI",
    scrollLabel: "Scroll",
    btnInvitation: "View Invitation",
    btnRsvp: "RSVP",
    btnStory: "Our Story"
  },
  story: {
    homeImageUrl: "",
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
    lede: "Saturday, the twelfth of December, two thousand and twenty-six. Ceremony at Agape House in East Legon, then we celebrate across town at El-Wak Sports Stadium in Cantonments.",
    ceremonyCard: {
      imageUrl: "",
      imageLabel: "Agape House · Ceremony",
      eyebrow: "The Ceremony",
      title: "Agape House · East Legon",
      addrLine1: "Lagos Avenue",
      addrLine2: "East Legon, Accra · Ghana",
      arrivalLabel: "Arrival",
      arrivalTime: "10:00 AM",
      vowsLabel: "Vows",
      vowsTime: "11:00 AM",
      attireLabel: "Attire",
      attireValue: "Formal"
    },
    receptionCard: {
      imageUrl: "",
      imageLabel: "El-Wak Sports Stadium · Reception",
      eyebrow: "The Reception",
      title: "El-Wak Sports Stadium",
      addrLine1: "Giffard Road",
      addrLine2: "Cantonments, Accra · Ghana",
      dinnerLabel: "Dinner",
      dinnerTime: "3:30 PM",
      dancingLabel: "Dancing",
      dancingTime: "6:00 PM",
      attireLabel: "Attire",
      attireValue: "Black tie"
    },
    mapPinCeremony: "Ceremony · 11:00 AM",
    mapPinReception: "Reception · 3:30 PM",
    /** Your own map (PNG/JPG/WebP, etc.) — any https URL; shown instead of the embed when set. */
    mapImageUrl: "",
    mapImageAlt: "Wedding venues map",
    /** Optional: opens when guests click the custom map (e.g. full-size PNG, Google My Maps, PDF). */
    mapImageLinkUrl: "",
    /** Embed iframe `src` (Google, OSM export, uMap, Waze, Bing, MapTiler) — used when mapImageUrl is empty and not using the interactive pin map. */
    mapEmbedUrl: "https://api.maptiler.com/maps/streets-v4/",
    mapEmbedTitle: "Accra · East Legon & Cantonments (ceremony → reception)",
    /** Fallback MapTiler map id if the embed URL is not MapTiler (same as Cloud map URL segment). Use a standard id like `streets-v4` with free keys; custom Cloud map UUIDs often need a paid plan. */
    mapTilerMapId: "streets-v4",
    /** Agape House · Lagos Ave, East Legon — decimal degrees for map pins. */
    ceremonyLat: "5.642609",
    ceremonyLng: "-0.157614",
    /** El-Wak Sports Stadium · Giffard Rd, Cantonments. */
    receptionLat: "5.586389",
    receptionLng: "-0.172778",
    mapUseLocationLabel: "Use my location",
    mapLocatingLabel: "Locating…",
    mapDirCeremonyGoogleLabel: "Google · to ceremony",
    mapDirReceptionGoogleLabel: "Google · to reception",
    mapDirectionsMenuLabel: "Directions",
    mapYouTooltip: "You",
    mapClickHintLabel: "Click the map to drop your pin",
    mapClearPinLabel: "Remove my pin",
    mapGeoDeniedBody:
      "Location access was blocked. You can still tap the map to show roughly where you are.",
    mapGeoErrorBody: "This browser could not read your location. Tap the map to drop your pin instead.",
    itineraryEyebrow: "The evening",
    itineraryTitle: "Itinerary",
    addCalendarLabel: "Add to calendar",
    itinerary: [
      { time: "10:00 AM", title: "Welcome arrival", sub: "Gather at Agape House before the procession", loc: "Agape House", attire: "Smart casual" },
      { time: "11:00 AM", title: "Ceremony", sub: "Vows at Agape House · East Legon", loc: "Agape House", attire: "Formal" },
      { time: "12:30 PM", title: "Cocktail hour", sub: "Light bites · transition toward Cantonments", loc: "En route", attire: "Formal" },
      { time: "3:30 PM", title: "Dinner & speeches", sub: "Celebration at the stadium", loc: "El-Wak Sports Stadium", attire: "Black tie" },
      { time: "6:00 PM", title: "Dancing", sub: "DJ set until late", loc: "El-Wak Sports Stadium", attire: "Bring shoes" }
    ]
  },
  travelLogistics: {
    navLabel: "Travel",
    eyebrow: "No. 03",
    eyebrowLabel: "Getting here",
    titleLine1: "From ",
    titleEm: "runway",
    titleLine2: "to dance floor",
    lede: "Planning your route to Accra — airport, a suggested place to stay, then Agape House for the ceremony and El-Wak Sports Stadium for the reception. Use Google Maps links below and the venue map for directions.",
    shuttleNote: "Guest transport will run between Agape House (East Legon) and El-Wak Sports Stadium (Cantonments) from 12:30 PM. Ask any attendant in a gold ribbon.",
    visaNote: "Entry rules depend on your passport. Check Ghana Immigration guidance (e-visa / visa on arrival) well before you travel.",
    disclaimer: "These notes are for planning only. Times, traffic, and policies change — please verify everything for your situation.",
    lastUpdated: "May 2026",
    googleMapsBtnLabel: "Google Maps",
    airport: {
      stepLabel: "Step 1 · Arrive",
      title: "Kotoka International Airport (ACC)",
      subtitle: "International & domestic hub",
      contextLine: "Most guests flying in",
      body: "Accra's main airport. Immigration and baggage can take time at peak hours — allow a buffer before your ride to the hotel.",
      addressLine1: "Airport Rd",
      addressLine2: "Accra · Ghana",
      googleUrl: "https://www.google.com/maps/search/?api=1&query=Kotoka+International+Airport+Accra",
      tips: "Cedis (GHS) for tips; Bolt and Uber pick up from Arrivals; buy a local SIM from official booths if you need data."
    },
    hotel: {
      stepLabel: "Step 2 · Stay",
      title: "Mövenpick Ambassador Hotel Accra",
      subtitle: "Suggested hotel · Cantonments",
      contextLine: "Near El-Wak — ask about our room block on your invitation",
      body: "A comfortable base between East Legon and the stadium. Early check-in may be available if you mention the wedding.",
      addressLine1: "Emporium Building, 13th Lane",
      addressLine2: "Airport Residential Area, Accra · Ghana",
      googleUrl: "https://www.google.com/maps/search/?api=1&query=Movenpick+Ambassador+Hotel+Accra",
      tips: "Ask the concierge for car service to Agape House and El-Wak; Accra traffic peaks 7–9 AM and 5–7 PM."
    },
    ceremony: {
      stepLabel: "Step 3 · Ceremony",
      title: "Agape House · East Legon",
      subtitle: "The wedding ceremony",
      contextLine: "If your RSVP includes the ceremony",
      body: "Welcome from 10:00 AM; vows at 11:00 AM. Formal attire. Please bring ID that matches your invitation.",
      addressLine1: "Lagos Avenue",
      addressLine2: "East Legon, Accra · Ghana",
      googleUrl: "https://www.google.com/maps/search/?api=1&query=Agape+House+East+Legon+Accra",
      tips: "Parking attendants will direct you; arrive early to find your seat before the processional."
    },
    reception: {
      stepLabel: "Step 4 · Reception",
      title: "El-Wak Sports Stadium",
      subtitle: "Dinner & dancing",
      contextLine: "All guests — or reception-only if you are not attending the earlier ceremony",
      body: "Black tie from 3:30 PM. If you are reception-only, aim to arrive from 3:00 PM at the stadium gate.",
      addressLine1: "Giffard Road",
      addressLine2: "Cantonments, Accra · Ghana",
      googleUrl: "https://www.google.com/maps/search/?api=1&query=El+Wak+Sports+Stadium+Accra",
      tips: "Follow signage to the reception entrance; guest transport from Agape House will be available from 12:30 PM."
    }
  },
  rsvp: {
    eyebrow: "No. 04",
    eyebrowLabel: "Reply",
    titleLine1: "Kindly ",
    titleEm: "reply",
    titleLine2: "by October 1st",
    lede: "A few questions so we can host you properly. Three short steps — and a quiet seat at the table is yours.",
    posterStampTop: "An Invitation",
    posterTitleLine1: "The pleasure",
    posterTitleLine2: "of your",
    posterTitleEm: "company",
    posterBody: "You are warmly invited to celebrate with us at Agape House and El-Wak Sports Stadium. We've reserved a seat in your name and would love to know how you take your wine.",
    posterStampLine: "Aaron & Princess · MMXXVI",
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
    noteLabel: "A note to Aaron & Princess",
    notePh: "Optional — anything at all",
    successEyebrow: "Received with love",
    successYesTitle: "We'll see you there.",
    successNoTitle: "We'll miss you, deeply.",
    successNoBody: "Thank you for letting us know. We'll send you photographs after the day, with love.",
    anotherGuest: "Reply for another guest",
    backLabel: "Back",
    continueLabel: "Continue",
    sendLabel: "Send reply",
    confirmVenue: "Agape House & El-Wak Stadium"
  },
  party: {
    eyebrow: "No. 05",
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
      { role: "Ring Bearer", name: "Eli, age 7", bio: "Will high-five everyone in the front row. We've decided to allow this.", imageUrl: "" },
      { role: "Bridesmaid", name: "", bio: "", imageUrl: "" },
      { role: "Groomsman", name: "", bio: "", imageUrl: "" },
      { role: "Bridesmaid", name: "", bio: "", imageUrl: "" },
      { role: "Groomsman", name: "", bio: "", imageUrl: "" },
      { role: "Bridesmaid", name: "", bio: "", imageUrl: "" },
      { role: "Groomsman", name: "", bio: "", imageUrl: "" }
    ]
  },
  gallery: {
    eyebrow: "No. 06",
    eyebrowLabel: "The album",
    titleLine1: "A small ",
    titleEm: "archive",
    lede: "Photographs from the years that led here, and the engagement shoot by film. Open an album to browse — arrow keys in the lightbox.",
    albums: [
      { id: "general", title: "Highlights", description: "Favourite moments", coverImageUrl: "" },
      { id: "ceremony", title: "Ceremony", description: "The wedding day", coverImageUrl: "" },
      { id: "reception", title: "Reception", description: "Evening celebration", coverImageUrl: "" },
    ],
    items: [
      { albumId: "general", ratio: "3/4", caption: "Engagement · Lagos", imageUrl: "" },
      { albumId: "general", ratio: "4/5", caption: "The proposal", imageUrl: "" },
      { albumId: "general", ratio: "1/1", caption: "Family · Nairobi", imageUrl: "" },
      { albumId: "ceremony", ratio: "4/3", caption: "First trip · Lisbon", imageUrl: "" },
      { albumId: "ceremony", ratio: "3/4", caption: "Sunday at home", imageUrl: "" },
      { albumId: "reception", ratio: "1/1", caption: "Grandmother's earrings", imageUrl: "" },
      { albumId: "reception", ratio: "4/5", caption: "Bridal portrait", imageUrl: "" },
      { albumId: "reception", ratio: "3/4", caption: "On the lagoon", imageUrl: "" },
      { albumId: "general", ratio: "4/3", caption: "After the rains", imageUrl: "" },
    ],
  },
  registry: {
    eyebrow: "No. 07",
    eyebrowLabel: "Gifts",
    titleLine1: "A quiet ",
    titleEm: "contribution",
    lede: "Your presence is the gift. For those who have insisted — a contribution toward our honeymoon in Zanzibar, or one of three causes close to us.",
    fundEyebrow: "Honeymoon fund",
    fundTitle: "An island in Zanzibar",
    currencies: "GHS · Paystack secure checkout",
    fundBody: "Two weeks on the east coast, a small fishing boat, and the slowest pace we can manage. Pick an amount, enter your email, and complete payment in the Paystack window (test or live keys from your dashboard).",
    fundPaymentLabel: "Honeymoon fund",
    amountPresetCsv: "200,500,1000",
    payCurrencyCode: "GHS",
    contributeEmailLabel: "Email (for receipt)",
    contributeEmailPlaceholder: "you@example.com",
    contributeNameLabel: "Name on the gift (optional)",
    contributeNamePlaceholder: "Your name",
    paystackMissingKeyHint: "Add PUBLIC_PAYSTACK_PUBLIC_KEY to your .env to enable Paystack checkout.",
    contributePaidNote: "Thank you — Paystack confirmed this reference:",
    qrEyebrow: "Scan to give",
    qrTitle: "Open the registry on your phone",
    qrUrl: "",
    qrDomain: "",
    qrHint: "Same page · contribution form"
  },
  stream: {
    eyebrow: "No. 08",
    eyebrowLabel: "Live",
    titleLine1: "Watch ",
    titleEm: "from",
    titleLine2: "anywhere",
    lede: "For the friends and family who cannot be there in person. The ceremony will stream live in 4K from three angles, with a private link sent to your inbox the morning of.",
    playerImageUrl: "",
    playerImageLabel: "Live · Agape House · Camera A",
    liveBadge: "Live in 12·12·26",
    controlsLeft: "4K · HDR",
    awaitingText: "Awaiting broadcast",
    previewText: "Preview · 00:24",
    panelEyebrow: "Set a reminder",
    panelTitle: "The broadcast begins Saturday at 11:00 AM GMT (Accra)",
    remindLabel: "Remind me",
    calendarLabel: "Add to calendar",
    schedule: [
      { label: "Pre-show", time: "10:30 AM" },
      { label: "Ceremony", time: "11:00 AM" },
      { label: "Cocktail hour", time: "12:30 PM" },
      { label: "Dinner & speeches", time: "3:30 PM" },
      { label: "First dance", time: "5:15 PM" }
    ]
  },
  invitation: {
    eyebrow: "No. 09",
    eyebrowLabel: "Guest experience",
    titleLine1: "A small ",
    titleEm: "concierge",
    titleLine2: "just for you",
    ledeTemplate: "{{name}}, this corner of the page is yours. Your invitation, your seat, and a few details we've put together for the weekend.",
    guestFirstName: "Eleanor",
    guestLastName: "Adekunle",
    qrUrl: "",
    card1Title: "QR Invitation",
    card1Body: "Scan to open the RSVP form on your phone. Staff can match this code to your guest record at the gate.",
    card2Title: "Seating",
    card2Body: "Table 07 · with the cousins from Nairobi. Window seat reserved.",
    card3Title: "RSVP",
    card3Body: "Let us know you are coming, share dietary needs, and tell us about any plus-ones.",
    card3CtaLabel: "Open RSVP",
    card4Title: "A welcome note",
    welcomeQuoteTemplate: "\"{{name}}, we cannot wait to see you. Save us a dance — A & P\"",
    card4Footer: "Personal · From the couple"
  },
  footer: {
    eyebrow: "With love, from",
    signatureLine1: "Aaron",
    signatureLine2: "Princess",
    hash: "#AaronTakesPrincess · MMXXVI",
    copyrightLine: "© Aaron & Princess · Twelve · Twelve · Twenty Six",
    creditLine: "Designed with care\nin Accra & Paris",
    social: [
      { label: "Instagram", href: "#" },
      { label: "Spotify", href: "#" },
      { label: "Photos", href: "#" },
      { label: "Contact", href: "#" }
    ]
  }
};

type WeddingSiteContent = typeof WEDDING_CONTENT_DEFAULT;

/**
 * Earlier edits merged a Lagos demo (Villa Sereno / Banana Island) into localStorage,
 * which overwrote Ghana venue defaults. Detect that snapshot and restore `details` only
 * so the rest of saved customizations (hero, story, etc.) stay intact.
 */
function repairDetailsIfMistakenNigeriaSnapshot(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const d = merged.details;
  const cer = d?.ceremonyCard;
  const rec = d?.receptionCard;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const bad =
    s(rec?.addrLine2).includes("Nigeria") ||
    s(cer?.addrLine2).includes("Nigeria") ||
    s(rec?.addrLine1).includes("Banana Island") ||
    s(cer?.addrLine1).includes("Banana Island") ||
    s(rec?.title).includes("Atrium at Sereno") ||
    s(cer?.title).includes("Villa Sereno");
  if (!bad) return { content: merged, didRepair: false };
  const details = JSON.parse(JSON.stringify(WEDDING_CONTENT_DEFAULT.details)) as WeddingSiteContent["details"];
  return { content: { ...merged, details }, didRepair: true };
}

/** Old saves still have the previous bride name; deep-replace so merged localStorage picks up “Princess”. */
function replaceLegacyAdaezeBranding(value: unknown): unknown {
  if (typeof value === "string") {
    if (!/Adaeze|aaron-adaeze|AaronTakesAdaeze|\bA & A\b/i.test(value)) return value;
    return value
      .replace(/\bAdaeze\b/gi, "Princess")
      .replace(/AaronTakesAdaeze/g, "AaronTakesPrincess")
      .replace(/aaron-adaeze/gi, "aaron-princess")
      .replace(/\bA & A\b/g, "A & P");
  }
  if (Array.isArray(value)) return value.map(replaceLegacyAdaezeBranding);
  if (isPlainObject(value)) {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      o[k] = replaceLegacyAdaezeBranding((value as Record<string, unknown>)[k]);
    }
    return o;
  }
  return value;
}

function repairLegacyAdaezeInContent(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const before = JSON.stringify(merged);
  const patched = replaceLegacyAdaezeBranding(merged) as WeddingSiteContent;
  return { content: patched, didRepair: JSON.stringify(patched) !== before };
}

/**
 * Older shipped content used a custom MapTiler Cloud map UUID. Many account keys return
 * HTTP 403 for that id (“Access to rendered maps not allowed”) while standard ids like `streets-v4` work.
 */
function repairMapTilerInaccessibleDemoMap(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const legacyId = "019e217e-3336-78fe-be8d-458487caf8f1";
  const replacementId = "streets-v4";
  const d = merged.details;
  if (!d) return { content: merged, didRepair: false };
  const emb = typeof d.mapEmbedUrl === "string" ? d.mapEmbedUrl : "";
  const mid = typeof d.mapTilerMapId === "string" ? d.mapTilerMapId.trim() : "";
  if (!emb.includes(legacyId) && mid !== legacyId) return { content: merged, didRepair: false };
  const nextEmb = emb.includes(legacyId) ? emb.split(legacyId).join(replacementId) : emb;
  const nextMid = mid === legacyId ? replacementId : mid.split(legacyId).join(replacementId);
  return {
    content: {
      ...merged,
      details: { ...d, mapEmbedUrl: nextEmb, mapTilerMapId: nextMid },
    },
    didRepair: true,
  };
}

/** Retired GH₵2,500 / GH₵5,000 tiers from older editor saves. */
/** Migrate RSVP poster from HTML fields to plain-text lines (no raw tags on the black card). */
function repairRsvpPosterPlainText(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const r = merged.rsvp;
  if (!r) return { content: merged, didRepair: false };
  let didRepair = false;
  const next = { ...r };

  const legacy = r as typeof r & { posterTitleHtml?: string; posterStampBottom?: string };
  const html = typeof legacy.posterTitleHtml === "string" ? legacy.posterTitleHtml : "";
  if (!r.posterTitleLine1?.trim() && html.trim()) {
    const emMatch = html.match(/<em[^>]*>(.*?)<\/em>/i);
    const em = emMatch ? stripToPlainText(emMatch[1]) : "";
    const withoutEm = html.replace(/<em[^>]*>.*?<\/em>/gi, em ? ` ${em}` : "");
    const plain = stripToPlainText(withoutEm);
    const lines = plain.split(/\n+/).map(s => s.trim()).filter(Boolean);
    next.posterTitleLine1 = lines[0] || "The pleasure";
    const secondLine = lines.slice(1).join(" ").trim();
    if (em && secondLine.endsWith(em)) {
      next.posterTitleLine2 = secondLine.slice(0, -em.length).trim() || "of your";
      next.posterTitleEm = em;
    } else {
      next.posterTitleLine2 = secondLine || "of your";
      next.posterTitleEm = em || "company";
    }
    didRepair = true;
  }

  const bottom = typeof legacy.posterStampBottom === "string" ? legacy.posterStampBottom : "";
  if (!r.posterStampLine?.trim() && bottom.trim()) {
    next.posterStampLine = stripToPlainText(bottom);
    didRepair = true;
  }

  for (const key of [
    "posterTitleLine1",
    "posterTitleLine2",
    "posterTitleEm",
    "posterBody",
    "posterStampTop",
    "posterStampLine",
  ] as const) {
    const v = next[key];
    if (typeof v === "string" && /<[^>]+>/.test(v)) {
      next[key] = stripToPlainText(v);
      didRepair = true;
    }
  }

  if (!didRepair) return { content: merged, didRepair: false };
  return { content: { ...merged, rsvp: next }, didRepair: true };
}

function repairRegistryAmountPresets(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const exclude = new Set([2500, 5000]);
  const csv = merged.registry?.amountPresetCsv;
  if (typeof csv !== "string" || !csv.trim()) return { content: merged, didRepair: false };
  const parts = csv
    .split(/[\s,;]+/)
    .map(s => parseInt(s.replace(/\D/g, ""), 10))
    .filter(n => Number.isFinite(n) && n > 0);
  const filtered = parts.filter(n => !exclude.has(n));
  if (filtered.length === parts.length) return { content: merged, didRepair: false };
  const nextCsv = (filtered.length ? filtered : [200, 500, 1000]).join(",");
  return {
    content: {
      ...merged,
      registry: { ...merged.registry, amountPresetCsv: nextCsv },
    },
    didRepair: true,
  };
}

/** Empty editor PIN in localStorage made unlock impossible; restore default from shipped content. */
function repairWeddingDateDerived(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const iso = merged.site?.weddingDateIso;
  if (!iso?.trim()) return { content: merged, didRepair: false };
  const patches = contentPatchesFromWeddingDate(iso);
  if (!patches) return { content: merged, didRepair: false };
  if (
    merged.hero?.dateDisplay === patches.hero.dateDisplay &&
    merged.nav?.monoId === patches.nav.monoId
  ) {
    return { content: merged, didRepair: false };
  }
  return {
    content: {
      ...merged,
      hero: { ...merged.hero, dateDisplay: patches.hero.dateDisplay },
      nav: { ...merged.nav, monoId: patches.nav.monoId },
    },
    didRepair: true,
  };
}

function repairGalleryAlbums(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const gz = merged.gallery || {};
  const defaultAlbums = WEDDING_CONTENT_DEFAULT.gallery.albums || [];
  const albums = Array.isArray(gz.albums) && gz.albums.length > 0 ? gz.albums : defaultAlbums;
  const albumIds = new Set(
    albums.map((a: { id?: string }) => String(a?.id ?? "").trim()).filter(Boolean)
  );
  const fallbackAlbumId = albumIds.has("general") ? "general" : String(albums[0]?.id ?? "general");
  const items = (Array.isArray(gz.items) ? gz.items : []).map(
    (item: { albumId?: string; ratio?: string; caption?: string; imageUrl?: string }) => ({
      ...item,
      albumId: albumIds.has(String(item?.albumId ?? "").trim())
        ? String(item.albumId).trim()
        : fallbackAlbumId,
    })
  );
  const needsAlbums = !Array.isArray(gz.albums) || gz.albums.length === 0;
  const needsAlbumId = (Array.isArray(gz.items) ? gz.items : []).some(
    (item: { albumId?: string }) => !String(item?.albumId ?? "").trim()
  );
  if (!needsAlbums && !needsAlbumId) return { content: merged, didRepair: false };
  return {
    content: {
      ...merged,
      gallery: { ...gz, albums, items },
    } as WeddingSiteContent,
    didRepair: true,
  };
}

function repairAdminPinIfEmpty(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const pin = merged.admin?.pin;
  const s = pin == null ? "" : String(pin).trim();
  if (s !== "") return { content: merged, didRepair: false };
  return {
    content: {
      ...merged,
      admin: { ...WEDDING_CONTENT_DEFAULT.admin, ...merged.admin, pin: WEDDING_CONTENT_DEFAULT.admin.pin },
    },
    didRepair: true,
  };
}

function repairPartyMembersCount(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const saved = merged.party?.members;
  const defaults = WEDDING_CONTENT_DEFAULT.party.members;
  if (!Array.isArray(saved) || saved.length >= defaults.length) return { content: merged, didRepair: false };
  const extra = defaults.slice(saved.length);
  return {
    content: { ...merged, party: { ...merged.party, members: [...saved, ...extra] } },
    didRepair: true,
  };
}

function repairMapPinTimes(merged: WeddingSiteContent): { content: WeddingSiteContent; didRepair: boolean } {
  const d = merged.details;
  if (!d) return { content: merged, didRepair: false };
  const OLD_CEREMONY = "Ceremony · 4:30 PM";
  const OLD_RECEPTION = "Reception · 7:30 PM";
  const NEW_CEREMONY = WEDDING_CONTENT_DEFAULT.details.mapPinCeremony;
  const NEW_RECEPTION = WEDDING_CONTENT_DEFAULT.details.mapPinReception;
  const needsCeremony = d.mapPinCeremony === OLD_CEREMONY;
  const needsReception = d.mapPinReception === OLD_RECEPTION;
  if (!needsCeremony && !needsReception) return { content: merged, didRepair: false };
  return {
    content: {
      ...merged,
      details: {
        ...d,
        ...(needsCeremony ? { mapPinCeremony: NEW_CEREMONY } : {}),
        ...(needsReception ? { mapPinReception: NEW_RECEPTION } : {}),
      },
    },
    didRepair: true,
  };
}

function applyContentRepairs(merged: WeddingSiteContent): { content: WeddingSiteContent; changed: boolean } {
  let changed = false;
  let next = merged;
  const steps = [
    repairDetailsIfMistakenNigeriaSnapshot,
    repairLegacyAdaezeInContent,
    repairGalleryAlbums,
    repairAdminPinIfEmpty,
    repairWeddingDateDerived,
    repairRsvpPosterPlainText,
    repairRegistryAmountPresets,
    repairMapTilerInaccessibleDemoMap,
    repairMapPinTimes,
    repairPartyMembersCount,
  ];
  for (const step of steps) {
    const r = step(next);
    next = r.content;
    changed ||= r.didRepair;
  }
  return { content: next, changed };
}

function persistLocalContent(merged: WeddingSiteContent) {
  try {
    localStorage.setItem(WEDDING_SITE_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota / private mode */
  }
}

function loadInitialSiteContent(): { content: WeddingSiteContent; hadStoredData: boolean } {
  const defaults = cloneDefaultContent();
  const stored = readStoredSite();
  let merged = deepMerge(defaults, stored.raw || {}) as WeddingSiteContent;
  let changed = stored.migratedFromV1;
  const repaired = applyContentRepairs(merged);
  merged = repaired.content;
  changed ||= repaired.changed;
  if (changed) persistLocalContent(merged);
  return { content: merged, hadStoredData: stored.raw !== null };
}

/** Basic shape check before import / server merge. */
export function validateSiteContentImport(
  raw: unknown
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, message: "Root must be a JSON object." };
  }
  if (!isPlainObject(raw.sections)) {
    return { ok: false, message: 'Missing or invalid `sections` object.' };
  }
  const known = new Set(Object.keys(WEDDING_CONTENT_DEFAULT));
  const unknown = Object.keys(raw).filter(k => !known.has(k));
  if (unknown.length > 5) {
    return {
      ok: false,
      message: `Too many unknown top-level keys (${unknown.slice(0, 3).join(", ")}…). Check the file.`,
    };
  }
  return { ok: true, value: raw };
}

export type SitePublishStatus = "idle" | "saving" | "saved" | "error" | "local-only";

type WeddingContentValue = {
  content: typeof WEDDING_CONTENT_DEFAULT;
  /** Deep-partial style updates merged into current content (same shape as the legacy site). */
  patchContent: (arg: unknown | ((prev: typeof WEDDING_CONTENT_DEFAULT) => unknown)) => void;
  replaceContent: (nextFull: unknown) => void;
  resetToDefaults: () => void;
  revision: number;
  contentHydrated: boolean;
  publishStatus: SitePublishStatus;
  publishError: string;
  /** Publish current copy for all visitors (editor session or PIN). */
  publishForEveryone: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

const WeddingContentContext = createContext<WeddingContentValue | null>(null);

function WeddingContentProvider({ children }: { children: ReactNode }) {
  const [{ content: initialContent, hadStoredData }] = useState(() => loadInitialSiteContent());
  const [content, setContent] = useState<WeddingSiteContent>(initialContent);
  const [revision, setRevision] = useState(0);
  const [contentHydrated, setContentHydrated] = useState(false);
  const [publishStatus, setPublishStatus] = useState<SitePublishStatus>("idle");
  const [publishError, setPublishError] = useState("");
  const contentRef = useRef(content);
  contentRef.current = content;
  const initialContentRef = useRef(content);

  const publishForEveryone = useCallback(async () => {
    if (!import.meta.env.PUBLIC_SUPABASE_URL?.trim()) {
      setPublishStatus("local-only");
      setPublishError("");
      return { ok: false as const, message: "Supabase is not configured." };
    }
    const authorization = await getAdminAuthHeader();
    if (!authorization) {
      return {
        ok: false as const,
        message: "Sign in as an editor or unlock with your PIN before publishing.",
      };
    }
    setPublishStatus("saving");
    setPublishError("");
    const result = await publishSiteContent(contentRef.current, authorization);
    if (result.ok) {
      setPublishStatus("saved");
      setPublishError("");
      const published = await fetchPublishedSiteContent();
      markLocalContentEdited(published?.updatedAt ?? new Date().toISOString());
      return { ok: true as const };
    }
    setPublishStatus("error");
    setPublishError(result.message);
    return { ok: false as const, message: result.message };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const published = await fetchPublishedSiteContent();
      if (cancelled) return;
      if (published?.content && isPlainObject(published.content)) {
        const defaults = cloneDefaultContent();
        let merged = deepMerge(defaults, published.content) as WeddingSiteContent;
        const repaired = applyContentRepairs(merged);
        merged = repaired.content;
        const localEditedAt = readLocalEditedAt();
        let applyPublished = shouldApplyPublishedSiteContent(localEditedAt, published.updatedAt);
        if (applyPublished) {
          setContent(merged);
          persistLocalContent(merged);
          if (published.updatedAt) markLocalContentEdited(published.updatedAt);
          setRevision(r => r + 1);
        }
      }
      if (!cancelled) setContentHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchContent = useCallback<WeddingContentValue["patchContent"]>(arg => {
    setContent(prev => {
      const partial = typeof arg === "function" ? arg(prev) : arg;
      const next = deepMerge(prev, partial) as typeof WEDDING_CONTENT_DEFAULT;
      persistLocalContent(next);
      markLocalContentEdited();
      return next;
    });
    setPublishStatus(s => (s === "saved" ? "idle" : s));
    setPublishError("");
    setRevision(r => r + 1);
  }, []);

  const replaceContent = useCallback<WeddingContentValue["replaceContent"]>(nextFull => {
    const validated = validateSiteContentImport(nextFull);
    const base = validated.ok ? validated.value : {};
    const next = deepMerge(cloneDefaultContent(), base) as typeof WEDDING_CONTENT_DEFAULT;
    const repaired = applyContentRepairs(next);
    setContent(repaired.content);
    persistLocalContent(repaired.content);
    markLocalContentEdited();
    setPublishStatus("idle");
    setPublishError("");
    setRevision(r => r + 1);
  }, []);

  const resetToDefaults = useCallback(() => {
    const next = cloneDefaultContent();
    setContent(next);
    try {
      localStorage.removeItem(WEDDING_SITE_STORAGE_KEY);
      localStorage.removeItem(WEDDING_SITE_STORAGE_KEY_LEGACY_V1);
      clearLocalEditedAt();
    } catch {
      /* ignore */
    }
    markLocalContentEdited();
    setPublishStatus("idle");
    setPublishError("");
    setRevision(r => r + 1);
  }, []);

  const value = useMemo(
    () => ({
      content,
      patchContent,
      replaceContent,
      resetToDefaults,
      revision,
      contentHydrated,
      publishStatus,
      publishError,
      publishForEveryone,
    }),
    [
      content,
      patchContent,
      replaceContent,
      resetToDefaults,
      revision,
      contentHydrated,
      publishStatus,
      publishError,
      publishForEveryone,
    ]
  );

  return <WeddingContentContext.Provider value={value}>{children}</WeddingContentContext.Provider>;
}

function useWeddingContent() {
  const ctx = useContext(WeddingContentContext);
  if (!ctx) throw new Error("useWeddingContent must be used inside WeddingContentProvider");
  return ctx;
}

export {
  WEDDING_SITE_STORAGE_KEY,
  WEDDING_SITE_STORAGE_KEY_LEGACY_V1,
  WEDDING_CONTENT_DEFAULT,
  WeddingContentProvider,
  useWeddingContent,
  deepMerge as deepMergeWeddingContent,
};
export type { WeddingContentValue };
