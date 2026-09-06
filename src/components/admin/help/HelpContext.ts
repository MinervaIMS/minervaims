import { createContext, useContext } from 'react';

// =====================================================================
// The help panel's open/close state, on its own, so that the two halves
// of the help system can be in two chunks.
//
// HelpSystem holds the provider and the buttons and is part of the
// workspace shell; HelpPanel holds the prose and is fetched when it is
// first opened. Both need this context, and if it lived in either of
// them the other would import it and the split would be undone.
// =====================================================================

export interface HelpState { page: string; topic?: string }

export interface HelpContextValue {
  openHelp: (page: string, topic?: string) => void;
  closeHelp: () => void;
  state: HelpState | null;
}

export const HelpContext = createContext<HelpContextValue>({
  openHelp: () => {},
  closeHelp: () => {},
  state: null,
});

export const useHelp = () => useContext(HelpContext);
