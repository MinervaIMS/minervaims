import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoColor from '@/assets/logo-color.png';

interface DropdownItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  dropdown?: DropdownItem[];
}

const navItems: NavItem[] = [
  { label: 'ABOUT US', href: '/about' },
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
    label: 'MEMBERS',
    dropdown: [
      { label: 'Our Team', href: '/members/team' },
      { label: 'Alumni', href: '/members/alumni' },
    ],
  },
  { label: 'EVENTS', href: '/events' },
];

export function Header() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-background shadow-subtle sticky top-0 z-50">
      <div className="container">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={logoColor} 
              alt="MIMS" 
              width={48}
              height={48}
              className="h-10 md:h-12 w-auto" 
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
                      className="font-serif text-small tracking-wider text-foreground hover:text-primary transition-colors py-2"
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
                            className="block px-4 py-2 text-small font-serif text-foreground hover:bg-muted hover:text-primary transition-colors"
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
                    className="font-serif text-small tracking-wider text-foreground hover:text-primary transition-colors py-2"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden font-serif text-small tracking-wider p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-separator py-4">
            {navItems.map((item) => (
              <div key={item.label} className="py-2">
                {item.dropdown ? (
                  <>
                    <button
                      className="font-serif text-small tracking-wider text-foreground w-full text-left py-2"
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    >
                      {item.label}
                      <span className="ml-1 text-xs">{openDropdown === item.label ? '▴' : '▾'}</span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="pl-4 py-2 space-y-2">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            className="block text-small font-serif text-muted-foreground hover:text-primary py-1"
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
                    className="font-serif text-small tracking-wider text-foreground block py-2"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="hairline" />
    </header>
  );
}
