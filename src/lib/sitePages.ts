/** Site routes — each page shows a focused subset of sections. */
export const SITE_PATHS = {
  home: "/",
  story: "/story",
  wedding: "/wedding",
  travel: "/travel",
  rsvp: "/rsvp",
  gallery: "/gallery",
  registry: "/registry",
  guest: "/guest",
} as const;

export type SitePageId = keyof typeof SITE_PATHS;

export function sitePath(page: SitePageId, hash?: string): string {
  const base = SITE_PATHS[page];
  return hash ? `${base}#${hash}` : base;
}

export const PAGE_TITLES: Record<SitePageId, string> = {
  home: "Aaron & Princess · 12.12.2026",
  story: "Our story · Aaron & Princess",
  wedding: "Wedding details · Aaron & Princess",
  travel: "Travel & stay · Aaron & Princess",
  rsvp: "RSVP · Aaron & Princess",
  gallery: "Gallery · Aaron & Princess",
  registry: "Registry & livestream · Aaron & Princess",
  guest: "My guest · Aaron & Princess",
};

export type NavLink = { href: string; label: string; page: SitePageId };

/** Editor sidebar tabs — `page` links to the public route for preview. */
export const EDITOR_TABS: { id: string; label: string; page?: SitePageId }[] = [
  { id: "sections", label: "Sections" },
  { id: "site", label: "Site & admin" },
  { id: "home", label: "Home hub", page: "home" },
  { id: "hero", label: "Hero", page: "home" },
  { id: "story", label: "Story", page: "story" },
  { id: "details", label: "Details", page: "wedding" },
  { id: "travel", label: "Travel", page: "travel" },
  { id: "rsvp", label: "RSVP", page: "rsvp" },
  { id: "party", label: "Party", page: "wedding" },
  { id: "gallery", label: "Gallery", page: "gallery" },
  { id: "registry", label: "Registry", page: "registry" },
  { id: "stream", label: "Live", page: "registry" },
  { id: "invitation", label: "Guests", page: "guest" },
  { id: "footer", label: "Footer" },
  { id: "backup", label: "Backup" },
];

export function editorTabLabel(tab: { label: string; page?: SitePageId }): string {
  if (!tab.page) return tab.label;
  return `${tab.label} (${SITE_PATHS[tab.page]})`;
}

export function buildNavLinks(
  sec: Record<string, boolean | undefined>,
  travelNavLabel?: string
): NavLink[] {
  const links: NavLink[] = [];
  if (sec.story !== false) links.push({ href: SITE_PATHS.story, label: "Story", page: "story" });
  if (sec.details !== false || sec.party !== false) {
    links.push({ href: SITE_PATHS.wedding, label: "Wedding", page: "wedding" });
  }
  if (sec.travel !== false) {
    links.push({
      href: SITE_PATHS.travel,
      label: (travelNavLabel || "Travel").trim() || "Travel",
      page: "travel",
    });
  }
  if (sec.gallery !== false) links.push({ href: SITE_PATHS.gallery, label: "Gallery", page: "gallery" });
  if (sec.registry !== false || sec.stream !== false) {
    links.push({ href: SITE_PATHS.registry, label: "Gifts", page: "registry" });
  }
  if (sec.invitation !== false || import.meta.env.PUBLIC_SUPABASE_URL) {
    links.push({ href: SITE_PATHS.guest, label: "My guest", page: "guest" });
  }
  return links;
}
