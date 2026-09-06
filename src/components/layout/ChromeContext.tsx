// =====================================================================
// A page saying what chrome it wants around it.
// ---------------------------------------------------------------------
// The site footer is decided by `Layout`, which knows only the URL. That
// is right for the workspace and PayoffLab, which are whole routes and
// can be named by path. It is wrong for the shape this exists for.
//
// A dozen pages - sign in, sign up, password reset, check your email,
// verify your email, session expired, access denied, pending approval,
// unsubscribe, and the application form - are all one object: a
// full-viewport dark backdrop with a single white card centred on it.
// They set `min-height: 100vh` and paint their own background edge to
// edge. Putting the site footer underneath gives you a screen that ends,
// and then a second screen of links, on a page whose whole job is to
// hold one card and one decision.
//
// Naming those routes in `Layout` would work today and rot tomorrow: the
// thirteenth page of this shape would be written, would look wrong, and
// nobody would know which list to add it to. So the SHELL declares it.
// Any page rendered through `AuthLayout` loses the footer by virtue of
// being that shape, and a page that stops being that shape gets it back
// without anybody remembering either.
//
// `useLayoutEffect` in the consumer, so the footer is gone before the
// browser paints rather than flickering away after it.
// =====================================================================

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

interface ChromeValue {
  footerHidden: boolean;
  setFooterHidden: (hidden: boolean) => void;
}

const ChromeContext = createContext<ChromeValue>({ footerHidden: false, setFooterHidden: () => {} });

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [footerHidden, setFooterHidden] = useState(false);
  const value = useMemo(() => ({ footerHidden, setFooterHidden }), [footerHidden]);
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export const useChrome = () => useContext(ChromeContext);

/**
 * Declare, for as long as this component is mounted, that the page it
 * belongs to carries no site footer.
 *
 * Restores it on unmount, so navigating from one of these pages to an
 * ordinary one brings the footer back with no further ceremony.
 */
export function useHideSiteFooter() {
  const { setFooterHidden } = useChrome();
  useLayoutEffect(() => {
    setFooterHidden(true);
    return () => setFooterHidden(false);
  }, [setFooterHidden]);
}
