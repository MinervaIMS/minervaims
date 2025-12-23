import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CookieConsent {
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  externalMedia: boolean;
  timestamp: string;
  version: string;
}

interface CookieContextType {
  consent: CookieConsent | null;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (preferences: Partial<CookieConsent>) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const COOKIE_CONSENT_KEY = 'mims_cookie_consent';
const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 180; // 6 months

const defaultConsent: CookieConsent = {
  necessary: true,
  preferences: false,
  analytics: false,
  externalMedia: false,
  timestamp: '',
  version: CONSENT_VERSION,
};

const CookieContext = createContext<CookieContextType | undefined>(undefined);

function getStoredConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as CookieConsent;
    
    // Check if consent has expired (6 months)
    const consentDate = new Date(parsed.timestamp);
    const expiryDate = new Date(consentDate.getTime() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > expiryDate) return null;
    
    // Check if version matches
    if (parsed.version !== CONSENT_VERSION) return null;
    
    return parsed;
  } catch {
    return null;
  }
}

function storeConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    console.warn('Failed to store cookie consent');
  }
}

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedConsent = getStoredConsent();
    if (storedConsent) {
      setConsent(storedConsent);
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
    setIsInitialized(true);
  }, []);

  const acceptAll = useCallback(() => {
    const newConsent: CookieConsent = {
      necessary: true,
      preferences: true,
      analytics: true,
      externalMedia: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    setConsent(newConsent);
    storeConsent(newConsent);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    const newConsent: CookieConsent = {
      necessary: true,
      preferences: false,
      analytics: false,
      externalMedia: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    setConsent(newConsent);
    storeConsent(newConsent);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const savePreferences = useCallback((preferences: Partial<CookieConsent>) => {
    const newConsent: CookieConsent = {
      necessary: true,
      preferences: preferences.preferences ?? false,
      analytics: preferences.analytics ?? false,
      externalMedia: preferences.externalMedia ?? false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    setConsent(newConsent);
    storeConsent(newConsent);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
    setShowBanner(false);
  }, []);

  const closePreferences = useCallback(() => {
    setShowPreferences(false);
    // If no consent exists, show banner again
    if (!consent) {
      setShowBanner(true);
    }
  }, [consent]);

  if (!isInitialized) {
    return <>{children}</>;
  }

  return (
    <CookieContext.Provider
      value={{
        consent,
        showBanner,
        showPreferences,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        openPreferences,
        closePreferences,
      }}
    >
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieProvider');
  }
  return context;
}
