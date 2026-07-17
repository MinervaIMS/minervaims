import { useState, useEffect, Fragment } from 'react';

/* ============================================================
   MIMS — Cookie Consent (TSX port)
   Banner = "Option B" (two-column calm)
   Settings = "Option A" (compact accordion)
   Integration: listens for `open-cookie-settings` window event to
   reopen the modal, and dispatches `cookie-consent` CustomEvent with
   { detail: { preferences, analytics, media } } after every save so
   analytics/embeds can gate loading by category.
   ============================================================ */

type ConsentKey = 'preferences' | 'analytics' | 'media';
type Consent = Record<ConsentKey, boolean>;

interface Category {
  key: 'necessary' | ConsentKey;
  name: string;
  desc: string;
  locked?: boolean;
}

const CATS: Category[] = [
  { key: 'necessary',   name: 'Strictly Necessary', locked: true,
    desc: 'Required for the website to function: security, network management and accessibility. These cookies cannot be disabled.' },
  { key: 'preferences', name: 'Preferences',
    desc: 'Allow the website to remember choices you make (such as language or region) and provide enhanced, personalised features.' },
  { key: 'analytics',   name: 'Analytics',
    desc: 'Help us understand how visitors interact with the website by collecting and reporting information anonymously.' },
  { key: 'media',       name: 'External Media',
    desc: 'Allow embedded content from third-party platforms (such as social media) to load on the page.' },
];

const STORAGE_KEY = 'mims-cookie-consent';
const BANNER_BODY = 'We use cookies to ensure the website functions correctly and to improve your experience. Non-essential cookies are used only with your consent.';

const Ic = {
  chevron: (p: { open?: boolean; s?: number } = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={p.s || 16} height={p.s || 16} style={{ transition: 'transform .2s', transform: p.open ? 'rotate(180deg)' : 'none' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  close: (p: { s?: number } = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={p.s || 18} height={p.s || 18}>
      <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ),
  lock: (p: { s?: number } = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} width={p.s || 13} height={p.s || 13}>
      <rect x="5" y="11" width="14" height="9" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
};

function Toggle({ on, locked, onChange }: { on: boolean; locked?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className="ck-switch"
      role="switch"
      aria-checked={on || !!locked}
      data-locked={locked ? 'true' : 'false'}
      onClick={() => { if (!locked) onChange(!on); }}
      aria-label={locked ? 'Always on' : 'Toggle'}
    >
      <span className="trk" /><span className="nob" />
    </button>
  );
}

export function openCookieSettings() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-cookie-settings'));
  }
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Consent>({ preferences: false, analytics: false, media: false });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Consent | null;
      if (saved) setPrefs(saved); else setShowBanner(true);
    } catch {
      setShowBanner(true);
    }
  }, []);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('open-cookie-settings', handler);
    return () => window.removeEventListener('open-cookie-settings', handler);
  }, []);

  const persist = (next: Consent) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setPrefs(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookie-consent', { detail: next }));
    }
  };

  const acceptAll = () => { persist({ preferences: true,  analytics: true,  media: true  }); setShowBanner(false); setShowSettings(false); };
  const rejectAll = () => { persist({ preferences: false, analytics: false, media: false }); setShowBanner(false); setShowSettings(false); };
  const save      = () => { persist(prefs); setShowBanner(false); setShowSettings(false); };

  return (
    <Fragment>
      {showBanner && (
        <div className="ck-banner" role="dialog" aria-label="Cookie consent">
          <div className="ck-banner__inner">
            <div className="ck-banner__copy">
              <h3 className="ck-banner__title">Cookie Consent</h3>
              <p className="ck-banner__text">
                {BANNER_BODY} You can change your preferences at any time via the{' '}
                <a className="ck-policy-link" href="/cookie-policy">Cookie Policy</a>.
              </p>
            </div>
            <div className="ck-banner__actions">
              <div className="ck-banner__row">
                <button className="ck-btn ck-btn--outline" style={{ flex: 1 }} onClick={rejectAll}>Reject Non-Essential</button>
                <button className="ck-btn ck-btn--primary" style={{ flex: 1 }} onClick={acceptAll}>Accept All</button>
              </div>
              <button className="ck-btn ck-btn--ghost" style={{ padding: '.5rem' }} onClick={() => setShowSettings(true)}>Manage Settings</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="ck-overlay" onClick={() => setShowSettings(false)}>
          <div
            className="ck-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Cookie settings"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ck-modal__head">
              <button className="ck-modal__x" aria-label="Close" onClick={() => setShowSettings(false)}>{Ic.close()}</button>
              <h2 className="ck-modal__title">Cookie Settings</h2>
              <p className="ck-modal__sub">Manage your cookie preferences. Non-essential cookies are only used with your consent.</p>
            </div>

            <div className="ck-modal__body">
              {CATS.map((c, i) => {
                const isOpen = open === c.key;
                const checked = c.locked ? true : prefs[c.key as ConsentKey];
                return (
                  <div key={c.key} className="ck-acc" style={{ borderTop: i ? '1px solid var(--mims-line)' : 'none' }}>
                    <div className="ck-acc__row">
                      <button className="ck-acc__head" onClick={() => setOpen(isOpen ? null : c.key)}>
                        {Ic.chevron({ open: isOpen, s: 15 })}
                        <span className="ck-acc__name">{c.name}</span>
                        {c.locked && <span className="ck-reqpill">{Ic.lock()} Always on</span>}
                      </button>
                      <Toggle
                        on={checked}
                        locked={c.locked}
                        onChange={(v) => setPrefs((s) => ({ ...s, [c.key]: v }))}
                      />
                    </div>
                    <div className="ck-acc__panel" style={{ maxHeight: isOpen ? 160 : 0, padding: isOpen ? '0 0 16px 29px' : '0 0 0 29px' }}>
                      <p className="ck-acc__desc">{c.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ck-modal__foot">
              <button className="ck-btn ck-btn--ghost" style={{ paddingLeft: 0, paddingRight: 14 }} onClick={rejectAll}>Reject All</button>
              <div style={{ flex: 1 }} />
              <button className="ck-btn ck-btn--outline" onClick={save}>Save Preferences</button>
              <button className="ck-btn ck-btn--primary" onClick={acceptAll}>Accept All</button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default CookieConsent;
