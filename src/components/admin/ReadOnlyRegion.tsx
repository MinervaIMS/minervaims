// =====================================================================
// View-only, made visible and made real.
// ---------------------------------------------------------------------
// A role with 'view' on a subsection could open the page, press the
// button that creates an event, fill in the dialog, press Save, and only
// then be told no, by an edge function, in a red toast reading "Edge
// Function returned a non-2xx status code". Nothing was ever written -
// the server has always been the boundary - but the interface spent the
// whole interaction pretending otherwise.
//
// The obvious fix is to have every page check `canManage` and disable its
// own controls. That is what the codebase has been doing, and it is why
// this exists: 36 of the 53 workspace components never make that check.
// Not because anyone was careless, but because it is a rule that has to
// be remembered separately in every file, by every future author, for
// every new button. A rule like that does not hold.
//
// So it is enforced once, for whatever subsection is open, from the same
// access matrix that decided the person could open it at all.
//
// ---------------------------------------------------------------------
// WHAT IT DISABLES, AND WHY THAT LIST AND NOT ANOTHER.
//
// ONLY BUTTONS, SWITCHES AND TICK BOXES. Not text fields, not dropdowns,
// not links. That sounds too narrow until you notice that in this
// workspace EVERY WRITE ENDS AT A BUTTON: a form is submitted by one, a
// dialog is confirmed by one, a row is deleted by one. Typing into a
// field whose Save button cannot be reached changes nothing, and leaving
// fields alone is what keeps every search box working for a reader who
// is here precisely to read.
//
// Switches and tick boxes are the exception, because they are the
// controls that write on the change itself with no button after them:
// the fee "paid" box, the "show on website" switch.
//
// WHAT STAYS LIVE. Anything that changes only what the reader sees:
// dropdown triggers (a Select alone writes nothing, and whatever would
// commit it is already disabled), anything that opens a menu or popover,
// anything that expands or collapses, tabs, and anything marked
// `data-ro` by hand for the cases the structure does not describe -
// opening a record to read it, previewing a document, downloading,
// clearing filters, the help dots, a dialog's close button.
//
// ---------------------------------------------------------------------
// WHERE IT REACHES.
//
// Two roots, because Radix renders dialogs through a PORTAL: an open
// dialog is a child of <body>, not of the page that opened it. A guard
// wrapped around the page would have left every dialog untouched, which
// is precisely where the Save buttons live. So the scope is the content
// pane AND any open dialog, and deliberately nothing else: the header's
// Sign Out, the navigation and the help panel are buttons too, and none
// of them is an edit.
//
// ---------------------------------------------------------------------
// IT IS NOT A SECURITY BOUNDARY AND MUST NOT BE MISTAKEN FOR ONE.
//
// This is an affordance. The boundary is the edge functions and the
// row-level security policies behind them, which is where it belongs and
// where it stays: everything disabled here is also refused there. What
// changes is that a reader is told before they invest the effort rather
// than after, and in the interface's own language rather than in a stack
// trace's.
// =====================================================================

import { useEffect } from 'react';

/**
 * Controls a read-only reader keeps, expressed structurally so that a page
 * does not have to know this exists in order to keep its filters working.
 */
const KEEPS_WORKING = [
  '[data-ro]',
  '[role="combobox"]',
  '[role="tab"]',
  '[aria-haspopup]',
  '[aria-expanded]',
].join(',');

// =====================================================================
// AND THE ONES THE STRUCTURE CANNOT DESCRIBE, RECOGNISED BY THEIR ICON.
// ---------------------------------------------------------------------
// "View" in this workspace has never meant look and touch nothing. The
// role permissions table has always defined it as opening the page and
// using LIGHT ACTIONS, "such as registering or downloading", and the
// first run of this guard duly broke both: it took the CSV export off
// the members register and the preview eye off a candidate's CV, which
// is worse than the problem it was written to solve.
//
// Marking every one of those by hand would mean touching twenty-three
// files and remembering the twenty-fourth. But the workspace draws them
// with the same icon set everywhere, and lucide stamps each icon with its
// own class, so the icon IS the marker: a button carrying a download
// arrow downloads, and a button carrying an eye shows you something.
// Recognising them costs nothing and covers pages nobody has written yet.
//
// Only icons whose meaning is unambiguously a read are listed. An X can
// close a dialog or delete a row; a pencil always edits. Neither is here.
// =====================================================================
const VIEW_ICONS = [
  '.lucide-download',      // export, save a copy
  '.lucide-eye',           // preview
  '.lucide-search',        // search
  '.lucide-external-link', // open elsewhere
  '.lucide-printer',
  '.lucide-chevron-left', '.lucide-chevron-right',
  '.lucide-chevron-up', '.lucide-chevron-down',
  '.lucide-arrow-left', '.lucide-arrow-right',
  '.lucide-arrow-up', '.lucide-arrow-down',
  '.lucide-chevrons-up-down',
  // lucide renamed HelpCircle to CircleHelp, and the class follows the
  // CANONICAL name rather than the alias the code imports. Both spellings
  // are listed so this keeps working across that rename in either
  // direction; a selector that matches nothing costs nothing.
  '.lucide-circle-help', '.lucide-help-circle',
].join(',');

/** What a read-only subsection takes away. */
const DISABLES = 'button, [role="switch"], input[type="checkbox"], input[type="radio"]';

/** The content pane, plus any dialog Radix has portalled out of it. */
const ROOTS = '[data-ws-pane], [role="dialog"], [role="alertdialog"]';

// =====================================================================
// PAGES THAT ARE INFORMATION, NOT A REGISTER.
// ---------------------------------------------------------------------
// "View but not manage" is the ordinary state of a page somebody can
// read and not edit. On the Dashboard and How to use it is the state of
// EVERYONE: no role holds 'manage' on either, because there is nothing on
// them to manage. They report; they are not edited by anybody.
//
// Guarding them therefore faded the whole Dashboard for every role except
// the President and the association account - including the invitation to
// register for Association on Display, which is exactly the kind of light
// action the permissions table has always said a view-level role keeps.
// A page whose every control is a link, a registration or a download has
// nothing for this guard to take away, so it is left alone.
// =====================================================================
const EXEMPT_RESOURCES = new Set(['dashboard', 'welcome']);

function sweep() {
  document.querySelectorAll<HTMLElement>(ROOTS).forEach((root) => {
    root.querySelectorAll<HTMLElement>(DISABLES).forEach((el) => {
      if (el.dataset.roDisabled === '1') return;
      if (el.matches(KEEPS_WORKING) || el.closest(KEEPS_WORKING)) return;
      if (el.querySelector(VIEW_ICONS)) return;
      el.dataset.roDisabled = '1';
      el.setAttribute('aria-disabled', 'true');
      // CSS fades them and stops the pointer; this stops the KEYBOARD,
      // which CSS cannot. `pointer-events: none` is invisible to Tab and
      // Enter, so without this a dead-looking button would still fire for
      // anyone navigating without a mouse - the readers most likely to be
      // relying on what the interface says about itself.
      el.setAttribute('tabindex', '-1');
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) el.disabled = true;
    });
  });
}

/** Undo everything the sweep did, so leaving a read-only page restores it. */
function release() {
  document.querySelectorAll<HTMLElement>('[data-ro-disabled="1"]').forEach((el) => {
    delete el.dataset.roDisabled;
    el.removeAttribute('aria-disabled');
    el.removeAttribute('tabindex');
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) el.disabled = false;
  });
}

/**
 * Applies the read-only treatment to the open subsection.
 *
 * Renders nothing. It is a behaviour, not a box, so it cannot disturb the
 * layout of any page it is switched on for.
 */
export function ReadOnlyRegion({ resource, readOnly }: { resource: string | null; readOnly: boolean }) {
  // The exemption is applied HERE rather than by the caller, so the list
  // of pages this does not touch lives beside the thing it does not do.
  const active = readOnly && !!resource && !EXEMPT_RESOURCES.has(resource);
  useEffect(() => {
    if (!active) { release(); return; }
    document.documentElement.dataset.wsReadonly = 'true';
    sweep();
    // These pages render asynchronously: a table arrives after its fetch, a
    // dialog mounts when it opens. A button that appears a second from now
    // has to be caught too, so the sweep repeats on every mutation rather
    // than running once.
    const observer = new MutationObserver(() => sweep());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.wsReadonly;
      release();
    };
  }, [active]);

  return null;
}
