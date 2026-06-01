/**
 * Header.tsx — Minerva IMS site navigation
 * Three-zone layout: logo (left) · links (CENTRED) · account (right).
 * Transparent on hero routes while hero is on screen; solid white otherwise.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoColor from "@/assets/logo-color.svg";
import logoWhite from "@/assets/logo-white.svg";
import { useAuth } from "@/contexts/AuthContext";

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
  { label: "Join", to: "/join" },
];

const HERO_ROUTES_EXACT = new Set(["/", "/about", "/join", "/events", "/archive", "/readings"]);
const HERO_ROUTE_PREFIXES = ["/divisions/", "/funds/", "/people/"];

const NAV_TRANSITION_MS = 200;
const NAV_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const DROPDOWN_CLOSE_DELAY_MS = 220;

const TEXT_SHADOW_TRANSPARENT =
  "0 1px 3px rgba(29,16,42,0.65), 0 0 16px rgba(29,16,42,0.45)";
const LOGO_FILTER_TRANSPARENT =
  "drop-shadow(0 1px 3px rgba(29,16,42,0.65)) drop-shadow(0 0 14px rgba(29,16,42,0.45))";

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
  const { user, profile } = useAuth();

  // Observe body[data-page-loading] so the header hides while Suspense fallback renders.
  useEffect(() => {
    const update = () => setPageLoading(document.body.hasAttribute("data-page-loading"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-page-loading"] });
    return () => mo.disconnect();
  }, []);

  // Scroll detection — measure the actual page hero so the threshold adapts per page.
  useEffect(() => {
    let threshold = 0;
    let rafId = 0;

    const findHero = (): HTMLElement | null =>
      (document.querySelector("[data-page-hero]") as HTMLElement | null) ||
      (document.querySelector("main [data-hero]") as HTMLElement | null) ||
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

    recompute();
    // Re-measure after layout settles (images/fonts/async content).
    const t1 = window.setTimeout(recompute, 100);
    const t2 = window.setTimeout(recompute, 500);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleRecompute);

    const ro = new ResizeObserver(scheduleRecompute);
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

  if (location.pathname.startsWith("/admin")) return null;
  if (pageLoading) return null;

  const pathname = location.pathname;
  const hasHero =
    HERO_ROUTES_EXACT.has(pathname) ||
    HERO_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
  const transparent = hasHero && !scrolled && !mobileOpen;

  const isActive = (to?: string) => {
    if (!to) return false;
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
  };
  const isItemActive = (item: NavItem) =>
    isActive(item.to) || (item.dropdown?.some((d) => isActive(d.to)) ?? false);

  const accountUser = user
    ? {
        fullName: profile?.full_name ?? user.email ?? "",
        avatarUrl: null as string | null,
      }
    : null;

  // Dropdown hover handlers — stable open with delayed close
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

  const linkTextStyle: React.CSSProperties = {
    transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, text-shadow ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
    textShadow: transparent ? TEXT_SHADOW_TRANSPARENT : "none",
  };

  const logoStyle: React.CSSProperties = {
    transition: `filter ${NAV_TRANSITION_MS}ms ${NAV_EASING}, opacity ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
    filter: transparent ? LOGO_FILTER_TRANSPARENT : "none",
  };

  return (
    <>
      {!hasHero && <div className="h-[84px]" />}
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 h-[84px] border-b",
          transparent
            ? "bg-transparent border-transparent shadow-none"
            : "bg-white border-[#E0E0E0] shadow-[0_1px_3px_0_rgba(0,0,0,0.07)]",
        ].join(" ")}
        style={headerStyle}
      >
        <div className="mx-auto grid h-full w-full max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-7 px-6 md:px-10 min-[880px]:grid-cols-[1fr_auto_1fr] max-[879px]:!grid-cols-[1fr_auto]">
          {/* zone 1 — logo */}
          <Link to="/" aria-label="Minerva IMS — home" className="justify-self-start flex items-center">
            <img
              src={transparent ? logoWhite : logoColor}
              alt="Minerva IMS"
              className="h-[50px] w-auto block"
              decoding="async"
              style={logoStyle}
            />
          </Link>

          {/* zone 2 — centred links (desktop ≥ 880px) */}
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
                        textShadow: transparent ? TEXT_SHADOW_TRANSPARENT : "none",
                        transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, text-shadow ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
                      }}
                    >
                      ▾
                    </span>
                  )}
                </>
              );
              const linkClass = [
                "relative inline-flex items-center whitespace-nowrap py-2 font-serif text-[18px] leading-none outline-none focus:outline-none",
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
                            className="block px-5 py-[11px] font-serif text-[17px] text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D]"
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

          {/* zone 3 — account (desktop ≥ 880px) */}
          <div className="hidden min-[880px]:flex justify-self-end">
            <Account user={accountUser} transparent={transparent} linkStyle={linkTextStyle} />
          </div>

          {/* mobile burger (< 880px) */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="min-[880px]:hidden justify-self-end inline-flex items-center justify-center w-11 h-11 bg-transparent border-0 outline-none focus:outline-none"
            style={{
              color: transparent ? "#ffffff" : "#1F0F4D",
              filter: transparent ? LOGO_FILTER_TRANSPARENT : "none",
              transition: `color ${NAV_TRANSITION_MS}ms ${NAV_EASING}, filter ${NAV_TRANSITION_MS}ms ${NAV_EASING}`,
            }}
          >
            {mobileOpen ? <X size={26} strokeWidth={2} /> : <Menu size={26} strokeWidth={2} />}
          </button>
        </div>
      </header>

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
          <Link to="/" aria-label="Minerva IMS — home" className="flex items-center">
            <img src={logoColor} alt="Minerva IMS" className="h-[46px] w-auto block" />
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

        {/* Scrollable nav body */}
        <nav className="flex-1 overflow-y-auto py-4">
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
                      "w-full flex items-center justify-between px-6 py-3 font-serif text-[17px]",
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
                          className="block pl-10 pr-6 py-3 font-serif text-[16px] text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D] active:bg-[#F2F2F2] active:text-[#1F0F4D]"
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
                  "block px-6 py-3 font-serif text-[17px]",
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
              to="/admin"
              className="flex items-center gap-3 px-6 py-4 font-serif text-[17px] text-[#1F0F4D] hover:bg-[#F2F2F2] active:bg-[#F2F2F2]"
            >
              <Avatar user={accountUser} transparent={false} />
              <span>Workspace</span>
            </Link>
          ) : (
            <Link
              to="/auth"
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
  if (!user) {
    return (
      <Link
        to="/auth"
        className="group relative inline-flex items-center font-serif text-[16px] leading-none outline-none focus:outline-none"
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
      to="/admin"
      className="group inline-flex items-center gap-3 outline-none focus:outline-none"
      style={linkStyle}
    >
      <span className="relative font-serif text-[16px] leading-none after:absolute after:left-0 after:right-0 after:-bottom-[3px] after:h-[1.5px] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-[240ms] group-hover:after:scale-x-100">
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
  const initials = (user.fullName || "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F0F4D] text-white font-sans font-bold text-[12.5px] tracking-wide uppercase ${ring}`}
    >
      {initials || "·"}
    </span>
  );
}
