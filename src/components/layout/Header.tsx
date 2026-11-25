/**
 * Header.tsx: Minerva IMS site navigation
 * Three-zone layout: logo (left) · links (CENTRED) · account (right).
 * Transparent on hero routes while hero is on screen; solid white otherwise.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, User, X } from "lucide-react";
import logoColor from "@/assets/logo-color.svg";
import logoWhite from "@/assets/logo-white.svg";
import { useAuth } from "@/contexts/AuthContext";
import { WORKSPACE_BASE, LEGACY_WORKSPACE_BASE } from "@/lib/workspace-base";

type NavItem = {
  label: string;
  to?: string;
  dropdown?: { label: string; to: string }[];
};

const NAV_LINKS: NavItem[] = [
  { label: "About", to: "/about" },
  {
    label: "Divisions",
    dropdown: [
      { label: "Equity Research", to: "/divisions/equity" },
      { label: "Investment Research", to: "/divisions/investment" },
      { label: "Macro Research", to: "/divisions/macro" },
      { label: "Portfolio Management", to: "/divisions/portfolio" },
      { label: "Quantitative Research", to: "/divisions/quant" },
    ],
  },
  {
    label: "Funds",
    dropdown: [
      { label: "Long-Short Equity Fund", to: "/funds/long-short" },
      { label: "Multi-Asset Global Opportunities Fund", to: "/funds/multi-asset" },
    ],
  },
  {
    label: "People",
    dropdown: [
      { label: "Members", to: "/people/members" },
      { label: "Alumni", to: "/people/alumni" },
    ],
  },
  { label: "Events", to: "/events" },
  { label: "Contacts", to: "/contacts" },
  { label: "Join", to: "/join" },
];

// Every page that opens on a dark picture has the clear bar over it (Step
// 107 added the four that still drew the white bar over their picture:
// Partnerships, Company relations, Division Fit and the Sitemap).
const HERO_ROUTES_EXACT = new Set(["/", "/about", "/join", "/events", "/archive", "/readings", "/contacts", "/track-record", "/partnerships", "/company-relations", "/join/division-fit", "/sitemap"]);
const HERO_ROUTE_PREFIXES = ["/divisions/", "/funds/", "/people/"];

// Pages whose hero is LIGHT (Step 105): a report's own page, on the light
// dot field. The bar is clear over the hero, as on every hero page, but
// keeps its dark type and the colour logo, because white would vanish on
// white; past the hero it turns solid exactly as elsewhere.
const LIGHT_HERO_PATTERNS = [/^\/archive\/[^/]+\/?$/];

// Pages on a white ground that keep their room under the bar (Step 107):
// the Statute and the four policies. Clear over their opening block, with
// dark type, like a report's page; solid once it has scrolled past. Only
// the bar changes: the pages themselves are not touched.
const CLEAR_LIGHT_ROUTES = new Set(["/statute", "/privacy-policy", "/cookie-policy", "/terms-of-use", "/disclaimer"]);

// Pages that sit on the dark animated background with a centred white
// card/box: the site header must ALWAYS stay transparent on these layouts,
// floating over the background, never switching to the solid white bar.
const CARD_ROUTES_EXACT = new Set([
  "/auth",
  "/check-email",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/password-reset-success",
  "/pending-approval",
  "/session-expired",
  "/unsubscribe",
  "/access-denied",
  "/apply",
  "/application-check-email",
  "/verify",
]);
// Card layouts on dynamic paths (cannot live in the exact set above):
// the event registration form shares the same white-card-over-beams layout,
// and so does a form (/forms/:id), answered by a member or a guest.
const CARD_ROUTE_PATTERNS = [/^\/events\/[^/]+\/register$/, /^\/events\/[^/]+\/cancel$/, /^\/verify\/[^/]+$/, /^\/forms\/[^/]+$/];

// =====================================================================
// THE WEBSITE'S SEARCH (Step 107): a magnifier beside the account on a
// computer and beside the menu on a phone, a row at the top of the phone
// menu, and "/" or Ctrl K anywhere on the public site. The search itself
// (components/search/SiteSearch.tsx) is loaded only when it is reached
// for, so the first screen of every page, the homepage's prerendered one
// included, is the same as before.
// =====================================================================
const loadSiteSearch = () => import("@/components/search/SiteSearch");
const SiteSearch = lazy(loadSiteSearch);
const prefetchSiteSearch = () => {
  void loadSiteSearch().catch(() => { /* loaded when opened */ });
  void import("@/components/search/site-search-sources").then((m) => m.prefetchSearchSources()).catch(() => { /* read when opened */ });
};

const NAV_TRANSITION_MS = 200;
const NAV_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const DROPDOWN_CLOSE_DELAY_MS = 220;

const TEXT_SHADOW_TRANSPARENT =
  "0 1px 3px rgba(29,16,42,0.85), 0 0 18px rgba(29,16,42,0.70)";
const LOGO_FILTER_TRANSPARENT =
  "drop-shadow(0 1px 3px rgba(29,16,42,0.85)) drop-shadow(0 0 16px rgba(29,16,42,0.70))";

export function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDd, setOpenDd] = useState<string | null>(null);
  const [mobileOpenDd, setMobileOpenDd] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(
    typeof document !== "undefined" && document.body.hasAttribute("data-page-loading"),
  );
  const closeTimerRef = useRef<number | null>(null);
  const { user, profile, memberPhotoUrl } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchUsed, setSearchUsed] = useState(false);
  // THE KEYBOARD COMES UP WITH THE TAP (Step 108). A phone opens its
  // keyboard only for a field focused inside the tap itself, and the search
  // is loaded on demand, so its own field does not exist yet at that moment.
  // This invisible field, at the top of the screen where the search's field
  // will be, takes the focus in the tap; the search hands the focus, and
  // anything already typed, to its own field as soon as it opens.
  const searchProxyRef = useRef<HTMLInputElement>(null);
  const openSearch = () => {
    searchProxyRef.current?.focus({ preventScroll: true });
    setMobileOpen(false); setSearchUsed(true); setSearchOpen(true);
  };

  // "/" or Ctrl K opens the search on the public site (the workspace has
  // its own, with the same keys).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const path = window.location.pathname;
      if (path.startsWith(WORKSPACE_BASE) || path.startsWith(LEGACY_WORKSPACE_BASE)) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        setMobileOpen(false);
        setSearchUsed(true);
        setSearchOpen((o) => !o);
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setMobileOpen(false);
        setSearchUsed(true);
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Observe body[data-page-loading] so the header hides while Suspense fallback renders.
  useEffect(() => {
    const update = () => setPageLoading(document.body.hasAttribute("data-page-loading"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-page-loading"] });
    return () => mo.disconnect();
  }, []);

  // Scroll detection: measure the actual page hero so the threshold adapts per page.
  useEffect(() => {
    let threshold = 0;
    let rafId = 0;

    // A PAGE MAY NAME ITS OWN FLIP POINT. The header is transparent over a
    // dark hero and solid over everything else, so what matters is where
    // the DARK GROUND ends, not where the hero section does. On the
    // homepage the hero also contains the white figures band, so measuring
    // the section left the header transparent over white for a whole band.
    // `[data-nav-flip]`, when a page provides one, is the dark part alone.
    const findHero = (): HTMLElement | null =>
      (document.querySelector("[data-nav-flip]") as HTMLElement | null) ||
      (document.querySelector("[data-page-hero]") as HTMLElement | null) ||
      (document.querySelector("main [data-hero]") as HTMLElement | null) ||
      // The opening block of the Statute and the policies (LegalLayout).
      (document.querySelector("main header.lp-hero") as HTMLElement | null) ||
      (document.querySelector("main > section:first-of-type") as HTMLElement | null) ||
      (document.querySelector("main > *:first-child") as HTMLElement | null);

    const recompute = () => {
      const hero = findHero();
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const heroBottom = rect.top + window.scrollY + rect.height;
        // Flip just before the hero fully scrolls past the header.
        threshold = Math.max(heroBottom - 80, 120);
      } else {
        threshold = Math.max(window.innerHeight * 0.85, 480);
      }
      setScrolled(window.scrollY > threshold);
    };

    const onScroll = () => setScrolled(window.scrollY > threshold);
    const scheduleRecompute = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recompute);
    };

    // THE FIRST MEASURE COMES FROM THE RESIZE OBSERVER BELOW (Step 102),
    // which reports every element it is given once, straight after the
    // browser has laid the page out: read there, the hero's position costs
    // nothing. Read at once, here, it forced the browser to lay out the
    // whole page in the middle of drawing it. A page always opens at the
    // top, where the header is the same either way, so nothing on screen
    // changes.
    // Re-measure after layout settles (images/fonts/async content).
    const t1 = window.setTimeout(recompute, 100);
    const t2 = window.setTimeout(recompute, 500);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleRecompute);

    const ro = new ResizeObserver(recompute);
    const hero = findHero();
    if (hero) ro.observe(hero);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleRecompute);
      ro.disconnect();
    };
  }, [location.pathname]);

  // Reset on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenDd(null);
    setMobileOpenDd(null);
  }, [location.pathname]);

  // Lock body scroll while mobile overlay is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (location.pathname.startsWith(WORKSPACE_BASE) || location.pathname.startsWith(LEGACY_WORKSPACE_BASE)) return null;

  // These three depend on nothing but the path, and are read by the loading
  // branch below as well as by the header itself, so they are resolved before
  // it rather than after.
  const pathname = location.pathname;
  const hasHero =
    HERO_ROUTES_EXACT.has(pathname) ||
    HERO_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
  const isCardRoute =
    CARD_ROUTES_EXACT.has(pathname) ||
    CARD_ROUTE_PATTERNS.some((re) => re.test(pathname));
  const lightHero = LIGHT_HERO_PATTERNS.some((re) => re.test(pathname));
  const clearLight = CLEAR_LIGHT_ROUTES.has(pathname);

  // =====================================================================
  // WHILE A ROUTE LOADS, THE HEADER STILL HOLDS ITS SPACE.
  // ---------------------------------------------------------------------
  // The bar itself is `position: fixed`, so hiding it moves nothing. What
  // does move is the SPACER below - the 84px block this component renders
  // in the flow on every route without a hero, so that page content starts
  // beneath the bar rather than under it.
  //
  // `return null` took that spacer away too. So the moment a Suspense
  // fallback appeared, <main> rose by 84px, and the moment the page
  // arrived it dropped back: two layout shifts of 0.058 each, on entering
  // and on leaving every loading state, on every route that has a spacer.
  // Nobody sees it, because the loader's overlay is opaque, and the
  // browser records it all the same.
  //
  // Returning the spacer alone keeps the behaviour that made this branch
  // exist - no navigation drawn over a loader, no scroll handling, no
  // dropdown state - and costs one empty div. Hero and card routes have no
  // spacer to preserve and still return nothing at all.
  // =====================================================================
  if (pageLoading) {
    return hasHero || isCardRoute || lightHero
      ? null
      : <div aria-hidden="true" style={{ height: "calc(84px + env(safe-area-inset-top))" }} />;
  }

  const transparent = ((hasHero && !scrolled) || isCardRoute) && !mobileOpen;
  // A clear bar: over a dark hero (white type, `transparent`) or over a
  // light one (dark type, Step 105).
  const clearBar = transparent || ((lightHero || clearLight) && !scrolled && !mobileOpen);

  const isActive = (to?: string) => {
    if (!to) return false;
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
  };
  const isItemActive = (item: NavItem) =>
    isActive(item.to) || (item.dropdown?.some((d) => isActive(d.to)) ?? false);

  const accountUser = user
    ? {
        fullName: profile?.full_name ?? user.email ?? "",
        avatarUrl: memberPhotoUrl,
      }
    : null;

  // Dropdown hover handlers: stable open with delayed close
  const openDropdown = (label: string) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenDd(label);
  };
  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setOpenDd(null);
      closeTimerRef.current = null;
    }, DROPDOWN_CLOSE_DELAY_MS);
  };

  const headerStyle: React.CSSProperties = {
    transition: `background-color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, border-color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, box-shadow ${NAV_TRANSITION_MS}ms ${NAV_EASING}, color ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
    color: transparent ? "rgba(255,255,255,0.95)" : "#1F0F4D",
  };

  const TEXT_SHADOW_SOLID =
    "0 1px 3px rgba(29,16,42,0), 0 0 18px rgba(29,16,42,0)";
  const linkTextStyle: React.CSSProperties = {
    transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, text-shadow ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
    textShadow: transparent ? TEXT_SHADOW_TRANSPARENT : TEXT_SHADOW_SOLID,
  };

  const logoStyle: React.CSSProperties = {
    transition: `filter ${NAV_TRANSITION_MS}ms ${NAV_EASING}, opacity ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
    filter: transparent ? LOGO_FILTER_TRANSPARENT : "none",
  };

  return (
    <>
      {!(hasHero || isCardRoute || lightHero) && (
        <div style={{ height: "calc(84px + env(safe-area-inset-top))" }} />
      )}
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 border-b",
          clearBar
            ? "bg-transparent border-transparent shadow-none"
            : "bg-white border-[#E0E0E0] shadow-[0_1px_3px_0_rgba(0,0,0,0.07)]",
        ].join(" ")}
        style={{ ...headerStyle, paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto grid h-[84px] w-full max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-7 px-6 md:px-10 min-[880px]:grid-cols-[1fr_auto_1fr] max-[879px]:!grid-cols-[1fr_auto]">
          {/* zone 1: logo */}
          <Link to="/" aria-label="Minerva IMS: home" className="justify-self-start flex items-center">
            <img
              src={transparent ? logoWhite : logoColor}
              alt="Minerva IMS"
              width={2000}
              height={2000}
              className="h-[52px] w-auto block"
              decoding="async"
              style={logoStyle}
            />
          </Link>

          {/* zone 2: centred links (desktop ≥ 880px) */}
          <nav className="hidden min-[880px]:flex items-center justify-center gap-[34px]">
            {NAV_LINKS.map((item) => {
              const active = isItemActive(item);
              const isOpen = openDd === item.label;
              const labelEl = (
                <>
                  {item.label}
                  {item.dropdown && (
                    <span
                      className="text-[0.62em] translate-y-px ml-1"
                      style={{
                        color: transparent ? "rgba(255,255,255,0.85)" : "rgba(31,15,77,0.55)",
                        textShadow: transparent ? TEXT_SHADOW_TRANSPARENT : TEXT_SHADOW_SOLID,
                        transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, text-shadow ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
                      }}
                    >
                      ▾
                    </span>
                  )}
                </>
              );
              const linkClass = [
                "relative inline-flex items-center whitespace-nowrap py-2 font-serif text-[19px] leading-none outline-none focus:outline-none",
                "after:absolute after:left-0 after:right-0 after:bottom-0.5 after:h-[1.5px] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-[240ms]",
                "hover:after:scale-x-100",
                active ? "after:scale-x-100" : "",
              ].join(" ");

              return (
                <div
                  key={item.label}
                  className="relative"
                  onPointerEnter={() => item.dropdown && openDropdown(item.label)}
                  onPointerLeave={() => item.dropdown && scheduleClose()}
                  onFocus={() => item.dropdown && openDropdown(item.label)}
                  onBlur={(e) => {
                    if (item.dropdown && !e.currentTarget.contains(e.relatedTarget as Node)) {
                      scheduleClose();
                    }
                  }}
                >
                  {item.to ? (
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={linkClass}
                      style={linkTextStyle}
                    >
                      {labelEl}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={linkClass + " cursor-default bg-transparent border-0"}
                      style={linkTextStyle}
                      aria-haspopup="true"
                      aria-expanded={isOpen}
                    >
                      {labelEl}
                    </button>
                  )}

                  {item.dropdown && (
                    // Invisible bridge wrapper: extends up under the trigger so the cursor never crosses dead space.
                    <div
                      className={[
                        "absolute left-1/2 top-full -translate-x-1/2 pt-3",
                        "transition-opacity",
                        isOpen ? "opacity-100 visible" : "opacity-0 invisible",
                      ].join(" ")}
                      style={{ transitionDuration: "180ms" }}
                    >
                      <div className="min-w-[266px] bg-white border border-[#E0E0E0] shadow-[0_8px_16px_-4px_rgba(0,0,0,0.10),0_4px_6px_-2px_rgba(0,0,0,0.06)] py-2 z-50">
                        {item.dropdown.map((sub) => (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            className="block px-5 py-[11px] font-serif text-[18px] text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D]"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* zone 3: search and account (desktop ≥ 880px) */}
          <div className="hidden min-[880px]:flex items-center gap-5 justify-self-end">
            <button
              type="button"
              onClick={openSearch}
              onPointerEnter={prefetchSiteSearch}
              onFocus={prefetchSiteSearch}
              aria-label="Search the website"
              title="Search the website (/ or Ctrl K)"
              className="inline-flex h-10 w-10 items-center justify-center bg-transparent border-0 outline-none focus-visible:ring-2 focus-visible:ring-current"
              style={{
                color: transparent ? "#ffffff" : "#1F0F4D",
                filter: transparent ? LOGO_FILTER_TRANSPARENT : "none",
                transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, filter ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
              }}
            >
              <Search size={21} strokeWidth={2} aria-hidden="true" />
            </button>
            <Account user={accountUser} transparent={transparent} linkStyle={linkTextStyle} />
          </div>

          {/* mobile search and burger (< 880px) */}
          <div className="min-[880px]:hidden justify-self-end flex items-center gap-1 -mr-2">
            <button
              type="button"
              aria-label="Search the website"
              onClick={openSearch}
              onTouchStart={prefetchSiteSearch}
              className="inline-flex items-center justify-center w-11 h-11 bg-transparent border-0 outline-none focus:outline-none"
              style={{
                color: transparent ? "#ffffff" : "#1F0F4D",
                filter: transparent ? LOGO_FILTER_TRANSPARENT : "none",
                transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, filter ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
              }}
            >
              <Search size={23} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center w-11 h-11 bg-transparent border-0 outline-none focus:outline-none"
              style={{
                color: transparent ? "#ffffff" : "#1F0F4D",
                filter: transparent ? LOGO_FILTER_TRANSPARENT : "none",
                transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, filter ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
              }}
            >
              {mobileOpen ? <X size={26} strokeWidth={2} /> : <Menu size={26} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </header>

      <input
        ref={searchProxyRef}
        id="site-search-proxy"
        type="search"
        inputMode="search"
        tabIndex={-1}
        autoComplete="off"
        aria-label="Search the website"
        className="pointer-events-none fixed left-0 top-0 h-px w-px border-0 bg-transparent p-0 text-base opacity-0"
        style={{ top: "env(safe-area-inset-top)" }}
      />
      {searchUsed && (
        <Suspense fallback={null}>
          <SiteSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}

      {/* Full-screen mobile overlay */}
      <div
        className={[
          "min-[880px]:hidden fixed inset-0 z-[60] bg-white flex flex-col",
          mobileOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none",
        ].join(" ")}
        style={{
          transition: `opacity ${NAV_TRANSITION_MS}ms ${NAV_EASING}, visibility ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        aria-hidden={!mobileOpen}
      >
        {/* Header row inside overlay */}
        <div className="flex items-center justify-between h-[84px] px-6 border-b border-[#E0E0E0] shrink-0">
          <Link to="/" aria-label="Minerva IMS: home" className="flex items-center">
            <img src={logoColor} alt="Minerva IMS" width={2000} height={2000} className="h-[52px] w-auto block" />
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center w-11 h-11 text-[#1F0F4D] bg-transparent border-0 outline-none focus:outline-none"
          >
            <X size={26} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable nav body: the search first (Step 107), then the pages. */}
        <nav className="flex-1 overflow-y-auto py-4">
          <button
            type="button"
            onClick={openSearch}
            onTouchStart={prefetchSiteSearch}
            className="mx-6 mb-3 flex w-[calc(100%-3rem)] items-center gap-3 border border-[#E0E0E0] px-4 h-12 text-left font-body text-[16px] text-[#6B6B6B] hover:border-[#1F0F4D] active:border-[#1F0F4D]"
          >
            <Search size={18} strokeWidth={2} className="text-[#1F0F4D]" aria-hidden="true" />
            Search the website
          </button>
          {NAV_LINKS.map((item) => {
            const active = isItemActive(item);
            if (item.dropdown) {
              const expanded = mobileOpenDd === item.label;
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setMobileOpenDd(expanded ? null : item.label)}
                    className={[
                      "w-full flex items-center justify-between px-6 py-3 font-serif text-[19px]",
                      "text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D] active:bg-[#F2F2F2] active:text-[#1F0F4D]",
                      active ? "text-[#1F0F4D]" : "",
                    ].join(" ")}
                    aria-expanded={expanded}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs opacity-60">{expanded ? "▴" : "▾"}</span>
                  </button>
                  {expanded && (
                    <div className="pb-1">
                      {item.dropdown.map((sub) => (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            className="block pl-10 pr-6 py-3 font-serif text-[18px] text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D] active:bg-[#F2F2F2] active:text-[#1F0F4D]"
                          >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to!}
                className={[
                  "block px-6 py-3 font-serif text-[19px]",
                  "text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D] active:bg-[#F2F2F2] active:text-[#1F0F4D]",
                  active ? "text-[#1F0F4D]" : "",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Account footer */}
        <div className="border-t border-[#E0E0E0] shrink-0">
          {accountUser ? (
            <Link
              to={WORKSPACE_BASE}
              className="flex items-center gap-3 px-6 py-4 font-serif text-[17px] text-[#1F0F4D] hover:bg-[#F2F2F2] active:bg-[#F2F2F2]"
            >
              <Avatar user={accountUser} transparent={false} />
              <span>Workspace</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              state={{ from: location.pathname + location.search }}
              className="block px-6 py-4 font-serif text-[17px] text-[#1F0F4D] hover:bg-[#F2F2F2] active:bg-[#F2F2F2]"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

/* ---- account cluster ---------------------------------------------------- */
function Account({
  user,
  transparent,
  linkStyle,
}: {
  user: { fullName: string; avatarUrl?: string | null } | null;
  transparent: boolean;
  linkStyle?: React.CSSProperties;
}) {
  const location = useLocation();
  if (!user) {
    return (
      <Link
        to="/auth"
        // Signing in from an event's registration or a form comes back to
        // it; the sign-in page ignores any other page (lib/return-path.ts).
        state={{ from: location.pathname + location.search }}
        className="group relative inline-flex items-center font-serif text-[18px] leading-none outline-none focus:outline-none"
        style={linkStyle}
      >
        <span className="relative after:absolute after:left-0 after:right-0 after:-bottom-[3px] after:h-[1.5px] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-[240ms] group-hover:after:scale-x-100">
          Login
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={WORKSPACE_BASE}
      className="group inline-flex items-center gap-3 outline-none focus:outline-none"
      style={linkStyle}
    >
      <span className="relative font-serif text-[18px] leading-none after:absolute after:left-0 after:right-0 after:-bottom-[3px] after:h-[1.5px] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-[240ms] group-hover:after:scale-x-100">
        Workspace
      </span>
      <Avatar user={user} transparent={transparent} />
    </Link>
  );
}

function Avatar({
  user,
  transparent,
}: {
  user: { fullName: string; avatarUrl?: string | null };
  transparent: boolean;
}) {
  const ring = transparent
    ? "shadow-[0_0_0_1px_rgba(255,255,255,0.55)]"
    : "shadow-[0_0_0_1px_#E0E0E0]";

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`h-8 w-8 shrink-0 rounded-full object-cover ${ring}`}
      />
    );
  }

  // =====================================================================
  // NO PHOTOGRAPH YET: THE SAME ANONYMOUS FIGURE THE WORKSPACE USES.
  // ---------------------------------------------------------------------
  // This used to draw the person's initials in bold Times New Roman on
  // white. Two letters in a serif, in a ring, read as a monogram: a
  // deliberate mark somebody chose, rather than the absence of one. And
  // it was the only place on the site where a missing photograph looked
  // like that, because the workspace roster already answers the same
  // question with a grey field and a plain figure.
  //
  // Using that figure here says the right thing (nothing has been
  // uploaded) in the language the rest of the product already speaks. The
  // ring and the round shape stay, so the header does not shift when a
  // photograph is added and the avatar becomes an image.
  // =====================================================================
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ${ring}`}
    >
      <User className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}
