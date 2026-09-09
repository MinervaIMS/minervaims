import * as React from "react";

const DESKTOP_BREAKPOINT = 1024;

/**
 * Is the viewport at least a desktop, ANSWERED ON THE FIRST RENDER.
 *
 * It used to start as `undefined` and settle in an effect, so on a
 * desktop every component reading it rendered ONCE AS A PHONE and again
 * as a desktop a frame later. Most of the workspace survives that,
 * because it only reads the value while rendering: the mobile shell is
 * mounted for one frame and replaced.
 *
 * WHAT DOES NOT SURVIVE IT is a component that SNAPSHOTS a permission
 * into state, and the workspace has one. Reports, Upload initialises its
 * "Publish now" switch from `canManage('reports-upload')`, which the
 * mobile read-only cap lowers whenever this hook says "phone". Read one
 * frame too early, on a desktop, the switch was born Off and stayed Off,
 * because a `useState` initialiser runs once: the page offered "Save
 * draft" to a President sitting at a computer.
 *
 * The dashboard reached the same conclusion for its ornaments and answers
 * its own media queries synchronously (`useMediaMatch` in
 * dashboard/motion.ts). This does the same, for the same reason: the
 * answer is right the first time, so nothing has to be rebuilt, and
 * nothing that reads it once reads it wrong.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => (
    typeof window === "undefined" ? false : window.innerWidth >= DESKTOP_BREAKPOINT
  ));

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const onChange = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
