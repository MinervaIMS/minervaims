/**
 * Header.tsx — Minerva IMS site navigation
 * Three-zone layout: logo (left) · links (CENTRED) · account (right).
 * Transparent on hero routes at top; solid white on scroll / non-hero routes.
 */
import { useEffect, useState } from "react";
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

const HERO_ROUTES = ["/", "/about", "/join"];

export function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDd, setOpenDd] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDd(null);
  }, [location.pathname]);

  if (location.pathname.startsWith("/admin")) return null;

  const hasHero = HERO_ROUTES.includes(location.pathname);
  const transparent = hasHero && !scrolled && !mobileOpen;

  const isActive = (to?: string) => {
    if (!to) return false;
    return to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  };
  const isItemActive = (item: NavItem) =>
    isActive(item.to) || (item.dropdown?.some((d) => isActive(d.to)) ?? false);

  const linkColor = transparent ? "text-white/90 hover:text-white" : "text-[#1F0F4D]";

  const accountUser = user
    ? {
        fullName: profile?.full_name ?? user.email ?? "",
        avatarUrl: null as string | null,
      }
    : null;

  return (
    <>
      {!hasHero && <div className="h-[84px]" />}
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 h-[84px] border-b transition-colors duration-300",
          transparent
            ? "bg-transparent border-transparent"
            : "bg-white border-[#E0E0E0] shadow-[0_1px_3px_0_rgba(0,0,0,0.07)]",
        ].join(" ")}
      >
        <div className="mx-auto grid h-full max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-7 px-6 md:px-10 min-[880px]:grid-cols-[1fr_auto_1fr] max-[879px]:!grid-cols-[1fr_auto]">
          {/* zone 1 — logo */}
          <Link to="/" aria-label="Minerva IMS — home" className="justify-self-start flex items-center">
            <img
              src={transparent ? logoWhite : logoColor}
              alt="Minerva IMS"
              className="h-[46px] w-auto block"
              decoding="async"
            />
          </Link>

          {/* zone 2 — centred links (desktop ≥ 880px) */}
          <nav className="hidden min-[880px]:flex items-center justify-center gap-[34px]">
            {NAV_LINKS.map((item) => {
              const active = isItemActive(item);
              const labelEl = (
                <>
                  {item.label}
                  {item.dropdown && <span className="text-[0.62em] opacity-60 translate-y-px ml-1">▾</span>}
                </>
              );
              const linkClass = [
                "relative inline-flex items-center whitespace-nowrap py-2 font-serif text-[17px] leading-none transition-colors outline-none focus:outline-none",
                linkColor,
                "after:absolute after:left-0 after:right-0 after:bottom-0.5 after:h-[1.5px] after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-[240ms]",
                "hover:after:scale-x-100",
                active ? "after:scale-x-100" : "",
              ].join(" ");

              return (
                <div key={item.label} className="group relative">
                  {item.to ? (
                    <Link to={item.to} aria-current={active ? "page" : undefined} className={linkClass}>
                      {labelEl}
                    </Link>
                  ) : (
                    <button type="button" className={linkClass + " cursor-default bg-transparent border-0"}>
                      {labelEl}
                    </button>
                  )}

                  {item.dropdown && (
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 absolute left-1/2 top-full mt-2 -translate-x-1/2 min-w-[266px] bg-white border border-[#E0E0E0] shadow-[0_8px_16px_-4px_rgba(0,0,0,0.10),0_4px_6px_-2px_rgba(0,0,0,0.06)] py-2 z-50">
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          className="block px-5 py-[11px] font-serif text-[16px] text-[#141414] hover:bg-[#F2F2F2] hover:text-[#1F0F4D]"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* zone 3 — account (desktop ≥ 880px) */}
          <div className="hidden min-[880px]:flex justify-self-end">
            <Account user={accountUser} transparent={transparent} />
          </div>

          {/* mobile burger (< 880px) */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className={`min-[880px]:hidden justify-self-end inline-flex items-center justify-center w-11 h-11 bg-transparent border-0 outline-none focus:outline-none ${
              transparent ? "text-white" : "text-[#1F0F4D]"
            }`}
          >
            {mobileOpen ? <X size={26} strokeWidth={2} /> : <Menu size={26} strokeWidth={2} />}
          </button>
        </div>

        {/* mobile panel */}
        {mobileOpen && (
          <div className="min-[880px]:hidden bg-white border-t border-[#E0E0E0] max-h-[calc(100vh-84px)] overflow-y-auto">
            <div className="px-6 py-4">
              {NAV_LINKS.map((item) => (
                <div key={item.label} className="py-1">
                  {item.dropdown ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenDd(openDd === item.label ? null : item.label)}
                        className="w-full flex items-center justify-between py-2 font-serif text-[17px] text-[#1F0F4D]"
                      >
                        <span>{item.label}</span>
                        <span className="text-xs opacity-60">{openDd === item.label ? "▴" : "▾"}</span>
                      </button>
                      {openDd === item.label && (
                        <div className="pl-3 pb-2">
                          {item.dropdown.map((sub) => (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              className="block py-2 font-serif text-[16px] text-[#141414] hover:text-[#1F0F4D]"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.to!}
                      className="block py-2 font-serif text-[17px] text-[#1F0F4D]"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="pt-3 mt-2 border-t border-[#E0E0E0]">
                <Account user={accountUser} transparent={false} />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

/* ---- account cluster ---------------------------------------------------- */
function Account({
  user,
  transparent,
}: {
  user: { fullName: string; avatarUrl?: string | null } | null;
  transparent: boolean;
}) {
  const color = transparent ? "text-white" : "text-[#1F0F4D]";

  if (!user) {
    return (
      <Link
        to="/auth"
        className={`group relative inline-flex items-center font-serif text-[16px] leading-none outline-none focus:outline-none ${color}`}
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
      className={`group inline-flex items-center gap-3 outline-none focus:outline-none ${color}`}
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
