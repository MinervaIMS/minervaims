import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoColor from '@/assets/logo-color.svg';
import logoWhite from '@/assets/logo-white.svg';
import { useAuth } from '@/contexts/AuthContext';

interface DropdownItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  dropdown?: DropdownItem[];
}

const baseNavItems: NavItem[] = [
  { label: 'ABOUT', href: '/about' },
  {
    label: 'DIVISIONS',
    dropdown: [
      { label: 'Equity Research', href: '/divisions/equity' },
      { label: 'Investment Research', href: '/divisions/investment' },
      { label: 'Macro Research', href: '/divisions/macro' },
      { label: 'Portfolio Management', href: '/divisions/portfolio' },
      { label: 'Quantitative Research', href: '/divisions/quant' },
    ],
  },
  {
    label: 'FUNDS',
    dropdown: [
      { label: 'Long Short Equity Fund', href: '/funds/long-short' },
      { label: 'Multi Asset Global Opportunities Fund', href: '/funds/multi-asset' },
    ],
  },
  {
    label: 'PEOPLE',
    dropdown: [
      { label: 'Members', href: '/people/members' },
      { label: 'Alumni', href: '/people/alumni' },
    ],
  },
  { label: 'JOIN US', href: '/join' },
];

export function Header() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isHomepage = location.pathname === '/';

  const navItems = isHomepage
    ? baseNavItems
    : [{ label: 'HOME', href: '/' }, ...baseNavItems];

  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && mobileMenu.contains(event.target as Node)) {
          return;
        }
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isHomepage) {
      setIsScrolled(true);
      return;
    }

    setIsScrolled(false);

    const handleScroll = () => {
      const threshold = window.innerHeight * 0.8;
      setIsScrolled(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomepage, user]);

  const isTransparent = isHomepage && !isScrolled && !mobileMenuOpen;

  const authButtonHref = user ? '/admin' : '/auth';
  const authButtonLabel = user ? 'WORKSPACE' : 'LOGIN';

  return (
    <>
      {!isHomepage && <div className="h-20 md:h-24" />}
      <header
        className={`fixed top-0 left-0 right-0 z-50 ${
          isTransparent
            ? 'bg-transparent shadow-none'
            : 'bg-background shadow-sm'
        }`}
      >
        <div className="container">
          <nav className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={isTransparent ? logoWhite : logoColor}
              alt="MIMS"
              width={56}
              height={56}
              className="h-12 md:h-14 w-auto transition-opacity duration-300"
              decoding="async"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8" ref={dropdownRef}>
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.dropdown ? (
                  <>
                    <button
                      className={`font-serif text-base tracking-wider transition-colors py-2 ${isTransparent ? 'text-background hover:text-background/80' : 'text-accent hover:text-accent/80'}`}
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    >
                      {item.label}
                      <span className="ml-1 text-xs">▾</span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-1 bg-background shadow-elevated border border-separator min-w-[280px] py-2 z-50">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            className="block px-4 py-2 text-base font-serif text-foreground hover:bg-muted hover:text-accent transition-colors"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href!}
                    className={`font-serif text-base tracking-wider transition-colors py-2 ${isTransparent ? 'text-background hover:text-background/80' : 'text-accent hover:text-accent/80'}`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Auth Button: WORKSPACE if logged in, LOGIN otherwise */}
            <Link
              to={authButtonHref}
              className={`font-serif text-base tracking-wider border px-4 py-2 transition-all duration-300 ${isTransparent ? 'bg-background text-foreground border-background hover:bg-transparent hover:text-background' : 'bg-background text-accent border-accent hover:bg-accent hover:text-background hover:shadow-md'}`}
            >
              {authButtonLabel}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`lg:hidden p-2 ${isTransparent ? 'text-background' : 'text-accent'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={28} strokeWidth={2} /> : <Menu size={28} strokeWidth={2} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden py-4 bg-background animate-slide-down">
            {navItems.map((item) => (
              <div key={item.label} className="py-2">
                {item.dropdown ? (
                  <>
                    <button
                      type="button"
                      className="font-serif text-base tracking-wider text-accent w-full text-left py-2 flex items-center justify-between"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === item.label ? null : item.label);
                      }}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs">{openDropdown === item.label ? '▴' : '▾'}</span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="pl-4 py-2 space-y-1 bg-muted/50 rounded-md mt-1">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setOpenDropdown(null);
                            }}
                            className="block text-base font-serif text-accent hover:text-accent/80 py-3 px-3"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href!}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-serif text-base tracking-wider text-accent block py-2"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Mobile Auth Button */}
            <div className="py-2 mt-2">
              <Link
                to={authButtonHref}
                onClick={() => setMobileMenuOpen(false)}
                className="font-serif text-base tracking-wider bg-background text-accent border border-accent px-4 py-2 inline-block hover:bg-accent hover:text-background hover:shadow-md transition-all duration-300"
              >
                {authButtonLabel}
              </Link>
            </div>
          </div>
        )}
        </div>
      </header>
    </>
  );
}
